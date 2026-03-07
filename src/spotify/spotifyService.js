const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const redirectUri =
  process.env.NODE_ENV === 'production'
    ? process.env.REACT_APP_SPOTIFY_REDIRECT_URI
    : 'http://127.0.0.1:3000/';

// Generate code_verifier
const generateCodeVerifier = (length) => {
  const randomBytes = new Uint8Array(length); // typed array
  crypto.getRandomValues(randomBytes);

  return Array.from(randomBytes)
    .map((value) => (value % 36).toString(36))
    .join('');
};

// Generate code_challenge
const generateCodeChallenge = async (codeVerifier) => {
  const encoder = new TextEncoder();
  const verifierBytes = encoder.encode(codeVerifier); // typed array
  const hashBuffer = await crypto.subtle.digest('SHA-256', verifierBytes);

  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const redirectToSpotify = async () => {
  const scope = 'user-read-private user-read-email playlist-modify-public';
  const codeVerifier = generateCodeVerifier(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  sessionStorage.setItem('code_verifier', codeVerifier);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    scope,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
};

export const getAccessToken = async () => {
  const params = new URLSearchParams(window.location.search);
  const authorizationCode = params.get('code');

  if (!authorizationCode) return null;

  const codeVerifier = sessionStorage.getItem('code_verifier');

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await response.json();

  if (data.access_token) {
    localStorage.setItem('spotify_token', data.access_token);
    window.history.replaceState({}, document.title, redirectUri);
    return data.access_token;
  }
  return null;
};

export const fetchUserId = async (accessToken) => {
  const response = await fetch('https://api.spotify.com/v1/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem('spotify_token');
    return null;
  }
  if (!response.ok) {
    throw new Error('Failed to fetch user ID', response.statusText);
  }

  const data = await response.json();
  return data.id;
};

export const searchSpotify = async (query, token) => {
  if (!token) {
    throw new Error('No access token available');
  }
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!response.ok) {
    redirectToSpotify();
    return;
  }
  const data = await response.json();
  return data.tracks.items;
};

export const savePlaylist = async (playlistTitle, playlist, token, userId) => {
  if (!playlistTitle && playlist.length === 0) {
    throw new Error('Please create your playlist with a title.');
  }
  if (!playlistTitle) {
    throw new Error('Please add a title.');
  }
  if (playlist.length === 0) {
    throw new Error('Please add some songs.');
  }
  try {
    // create a playlist
    const response = await fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playlistTitle,
          public: true,
        }),
      },
    );
    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(`error creating playlist: ${errorDetails}`);
    }
    const playlistData = await response.json();
    const tracksUris = playlist.map((track) => track.uri);

    //add tracks to playlist
    const addTrackResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: tracksUris,
        }),
      },
    );
    if (!addTrackResponse.ok) {
      const errorDetails = await addTrackResponse.text();
      throw new Error(`Error adding tracks to playlist: ${errorDetails}`);
    }
    return playlistData;
  } catch (error) {
    console.error('Error saving playlist', error);
    throw new Error('Error saving playlist.');
  }
};

const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const redirectUri =
  process.env.NODE_ENV === 'production'
    ? process.env.REACT_APP_SPOTIFY_REDIRECT_URI
    : 'http://127.0.0.1:3000/';

export const redirectToSpotify = () => {
  const scope = 'user-read-private user-read-email playlist-modify-public';
  window.location.href = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
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

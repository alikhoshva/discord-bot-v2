// tests/mocks/mockServices.js

export function createMockGeminiResponse(tracks = []) {
  const defaultTracks = [
    { title: 'Cyberpunk Synthwave', artist: 'SynthMaster' },
    { title: 'Neon Lights', artist: 'RetroWave' },
    { title: 'Midnight City', artist: 'M83' },
  ];
  return {
    response: {
      text: () => JSON.stringify(tracks.length ? tracks : defaultTracks),
    },
  };
}

export function createMockYouTubeAutocomplete() {
  return [
    { name: 'synthwave 80s music mix', value: 'synthwave 80s music mix' },
    { name: 'synthwave chillwave mix', value: 'synthwave chillwave mix' },
    { name: 'synthwave radio live', value: 'synthwave radio live' },
  ];
}

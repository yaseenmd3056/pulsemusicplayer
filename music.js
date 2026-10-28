(() => {
  'use strict';

  const songs = [
    { id: 'shape-of-you', title: 'Shape Of You', artist: 'Ed Sheeran', genre: 'pop', cover: 'images/shapeofyou.jpg', audio: 'songs/shapeofyou.mp3' },
    { id: 'all-of-me', title: 'All Of Me', artist: 'John Legend', genre: 'pop', cover: 'images/allofme.jpg', audio: 'songs/allofme.mp3' },
    { id: 'sugar', title: 'Sugar', artist: 'Maroon 5', genre: 'pop', cover: 'images/sugar.jpg', audio: 'songs/Sugar.mp3' },
    { id: 'locked-away', title: 'Locked Away', artist: 'R. City ft. Adam Levine', genre: 'pop', cover: 'images/lockedaway.jpg', audio: 'songs/lockedaway.mp3' },
    { id: 'wonderwall', title: 'Wonderwall', artist: 'Oasis', genre: 'rock', cover: 'images/wonderwall.jpg', audio: 'songs/wonderwall.mp3' },
    { id: 'someone-like-you', title: 'Someone Like You', artist: 'Adele', genre: 'pop', cover: 'images/somethinglikeyou.jpg', audio: 'songs/somethinglikeyou.mp3' }
  ];

  const $ = (selector) => document.querySelector(selector);
  const els = {
    songGrid: $('#songGrid'), emptyState: $('#emptyState'), search: $('#searchInput'), genre: $('#genreFilter'),
    audio: $('#audio'), cover: $('#playerCover'), title: $('#playerTitle'), artist: $('#playerArtist'),
    play: $('#playButton'), progress: $('#progress'), currentTime: $('#currentTime'), duration: $('#duration'),
    volume: $('#volume'), queue: $('#currentPlaylist'), queueCount: $('#queueCount'), saved: $('#allPlaylists'),
    sidebarPlaylists: $('#sidebarPlaylists'), toast: $('#toast'), dialog: $('#playlistDialog'), form: $('#playlistForm'),
    playlistInput: $('#playlistInput'), theme: $('#themeToggle'), like: $('#likeButton'), shuffle: $('#shuffleButton'), repeat: $('#repeatButton')
  };

  let currentSongIndex = 0;
  let queue = [];
  let playlists = readStorage('pulse-playlists', []);
  let favorites = new Set(readStorage('pulse-favorites', []));
  let isShuffle = false;
  let repeatMode = 'off';
  let toastTimer;

  function readStorage(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
    catch { return fallback; }
  }
  function writeStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { showToast('Browser storage is unavailable.'); }
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  }
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2300);
  }
  function currentSong() { return songs[currentSongIndex]; }

  function renderSongs() {
    const query = els.search.value.trim().toLowerCase();
    const genre = els.genre.value;
    const visible = songs.map((song, index) => ({ song, index })).filter(({ song }) => {
      const matchesGenre = genre === 'all' || song.genre === genre;
      const matchesSearch = `${song.title} ${song.artist} ${song.genre}`.toLowerCase().includes(query);
      return matchesGenre && matchesSearch;
    });
    els.songGrid.innerHTML = visible.map(({ song, index }) => `
      <article class="song-card ${index === currentSongIndex ? 'is-playing' : ''}" data-song-index="${index}">
        <div class="cover-wrap"><img src="${song.cover}" alt="${escapeHTML(song.title)} cover art" loading="lazy"><button class="card-play" type="button" data-action="play" aria-label="Play ${escapeHTML(song.title)}">${index === currentSongIndex && !els.audio.paused ? 'Ⅱ' : '▶'}</button></div>
        <div class="card-meta"><div style="min-width:0"><h3>${escapeHTML(song.title)}</h3><p>${escapeHTML(song.artist)}</p></div><span class="genre-tag">${escapeHTML(song.genre)}</span></div>
        <div class="card-meta" style="margin-top:7px"><span class="muted" style="font-size:10px">${index === currentSongIndex ? 'Now selected' : 'Ready to play'}</span><button class="card-add" type="button" data-action="queue" aria-label="Add ${escapeHTML(song.title)} to queue" title="Add to queue">＋</button></div>
      </article>`).join('');
    els.emptyState.hidden = visible.length > 0;
  }
  function loadSong(index, autoplay = false) {
    currentSongIndex = (index + songs.length) % songs.length;
    const song = currentSong();
    els.audio.src = song.audio;
    els.cover.src = song.cover;
    els.cover.alt = `${song.title} cover art`;
    els.title.textContent = song.title;
    els.artist.textContent = song.artist;
    els.progress.value = '0';
    els.currentTime.textContent = '0:00';
    els.duration.textContent = '0:00';
    updatePlayButton();
    updateFavoriteButton();
    renderSongs();
    if (autoplay) playAudio();
  }
  async function playAudio() {
    try { await els.audio.play(); }
    catch (error) {
      if (error.name !== 'AbortError') showToast('Could not play this track. Check the audio file path.');
    }
    updatePlayButton();
    renderSongs();
  }
  function updatePlayButton() {
    const playing = !els.audio.paused;
    els.play.textContent = playing ? 'Ⅱ' : '▶';
    els.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    els.play.title = playing ? 'Pause' : 'Play';
  }
  function togglePlayback() {
    if (els.audio.paused) playAudio(); else { els.audio.pause(); updatePlayButton(); renderSongs(); }
  }
  function nextSong() {
    if (isShuffle && songs.length > 1) {
      let next = currentSongIndex;
      while (next === currentSongIndex) next = Math.floor(Math.random() * songs.length);
      loadSong(next, true);
    } else loadSong(currentSongIndex + 1, true);
  }
  function previousSong() {
    if (els.audio.currentTime > 3) { els.audio.currentTime = 0; return; }
    loadSong(currentSongIndex - 1, true);
  }
  function addToQueue(songIndex = currentSongIndex) {
    queue.push(songs[songIndex]);
    renderQueue();
    showToast(`${songs[songIndex].title} added to your queue`);
  }
  function renderQueue() {
    els.queueCount.textContent = `${queue.length} ${queue.length === 1 ? 'track' : 'tracks'}`;
    if (!queue.length) {
      els.queue.innerHTML = '<div class="queue-empty"><span>♫</span><p>Your queue is waiting.</p><small>Add a song to get started.</small></div>';
      return;
    }
    els.queue.innerHTML = queue.map((song, index) => `<div class="queue-item"><img src="${song.cover}" alt="" loading="lazy"><div class="queue-item-info"><strong>${escapeHTML(song.title)}</strong><span>${escapeHTML(song.artist)}</span></div><button type="button" data-queue-index="${index}" aria-label="Remove ${escapeHTML(song.title)} from queue" title="Remove">×</button></div>`).join('');
  }
  function createPlaylist(name) {
    const cleanName = name.trim().replace(/\s+/g, ' ');
    if (!cleanName) { showToast('Enter a playlist name first.'); return; }
    if (playlists.some((playlist) => playlist.name.toLowerCase() === cleanName.toLowerCase())) { showToast('A playlist with that name already exists.'); return; }
    playlists.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: cleanName, songs: [] });
    writeStorage('pulse-playlists', playlists);
    renderPlaylists();
    showToast(`“${cleanName}” created`);
  }
  function renderPlaylists() {
    if (!playlists.length) {
      els.saved.innerHTML = '<p class="muted" style="font-size:12px;line-height:1.6">Create a playlist to keep your favorites together.</p>';
      els.sidebarPlaylists.innerHTML = '<p class="muted tiny">Your playlists will appear here.</p>';
      return;
    }
    els.saved.innerHTML = playlists.map((playlist) => `<div class="saved-playlist"><div class="playlist-art" aria-hidden="true">♫</div><div class="saved-playlist-info"><strong>${escapeHTML(playlist.name)}</strong><span>${playlist.songs.length} ${playlist.songs.length === 1 ? 'track' : 'tracks'}</span></div><button type="button" data-add-playlist="${escapeHTML(playlist.id)}" title="Add current song to ${escapeHTML(playlist.name)}" aria-label="Add current song to ${escapeHTML(playlist.name)}">＋</button><button type="button" data-delete-playlist="${escapeHTML(playlist.id)}" title="Delete ${escapeHTML(playlist.name)}" aria-label="Delete ${escapeHTML(playlist.name)}">×</button></div>`).join('');
    els.sidebarPlaylists.innerHTML = playlists.map((playlist) => `<button type="button" class="sidebar-playlist" data-add-playlist="${escapeHTML(playlist.id)}">♫ &nbsp;${escapeHTML(playlist.name)}</button>`).join('');
  }
  function updateFavoriteButton() {
    const liked = favorites.has(currentSong().id);
    els.like.textContent = liked ? '♥' : '♡';
    els.like.classList.toggle('liked', liked);
    els.like.setAttribute('aria-label', liked ? 'Remove current song from favorites' : 'Add current song to favorites');
  }
  function toggleFavorite() {
    const song = currentSong();
    if (favorites.has(song.id)) { favorites.delete(song.id); showToast('Removed from favorites'); }
    else { favorites.add(song.id); showToast('Added to favorites'); }
    writeStorage('pulse-favorites', [...favorites]);
    updateFavoriteButton();
  }
  function openPlaylistDialog() {
    if (typeof els.dialog.showModal === 'function') els.dialog.showModal();
    else { const name = window.prompt('Playlist name'); if (name) createPlaylist(name); return; }
    els.playlistInput.focus();
  }

  els.songGrid.addEventListener('click', (event) => {
    const card = event.target.closest('[data-song-index]');
    if (!card) return;
    const index = Number(card.dataset.songIndex);
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'queue') addToQueue(index);
    else if (action === 'play') {
      if (index === currentSongIndex) togglePlayback(); else loadSong(index, true);
    } else loadSong(index, true);
  });
  els.search.addEventListener('input', renderSongs);
  els.genre.addEventListener('change', renderSongs);
  $('#playButton').addEventListener('click', togglePlayback);
  $('#nextButton').addEventListener('click', nextSong);
  $('#prevButton').addEventListener('click', previousSong);
  $('#heroPlay').addEventListener('click', () => { if (els.audio.paused) playAudio(); else nextSong(); });
  $('#queueButton').addEventListener('click', () => addToQueue());
  els.like.addEventListener('click', toggleFavorite);
  els.shuffle.addEventListener('click', () => { isShuffle = !isShuffle; els.shuffle.classList.toggle('active', isShuffle); showToast(isShuffle ? 'Shuffle is on' : 'Shuffle is off'); });
  els.repeat.addEventListener('click', () => {
    repeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    els.repeat.classList.toggle('active', repeatMode !== 'off');
    els.repeat.textContent = repeatMode === 'one' ? '↻¹' : '↻';
    showToast(`Repeat ${repeatMode === 'off' ? 'off' : repeatMode === 'all' ? 'all tracks' : 'current track'}`);
  });
  els.audio.addEventListener('play', updatePlayButton);
  els.audio.addEventListener('pause', () => { updatePlayButton(); renderSongs(); });
  els.audio.addEventListener('loadedmetadata', () => { els.duration.textContent = formatTime(els.audio.duration); });
  els.audio.addEventListener('timeupdate', () => {
    if (Number.isFinite(els.audio.duration) && els.audio.duration > 0) els.progress.value = String(Math.round((els.audio.currentTime / els.audio.duration) * 1000));
    els.currentTime.textContent = formatTime(els.audio.currentTime);
  });
  els.audio.addEventListener('ended', () => {
    if (repeatMode === 'one') { els.audio.currentTime = 0; playAudio(); }
    else if (repeatMode === 'all' || isShuffle || currentSongIndex < songs.length - 1) nextSong();
    else updatePlayButton();
  });
  els.audio.addEventListener('error', () => showToast('Audio file unavailable. Verify the song file and filename.'));
  els.progress.addEventListener('input', () => { if (Number.isFinite(els.audio.duration)) els.audio.currentTime = (Number(els.progress.value) / 1000) * els.audio.duration; });
  els.volume.addEventListener('input', () => { els.audio.volume = Number(els.volume.value); });
  els.audio.volume = Number(els.volume.value);
  els.queue.addEventListener('click', (event) => {
    const button = event.target.closest('[data-queue-index]');
    if (!button) return;
    queue.splice(Number(button.dataset.queueIndex), 1);
    renderQueue();
  });
  function handlePlaylistAction(event) {
    const addButton = event.target.closest('[data-add-playlist]');
    const deleteButton = event.target.closest('[data-delete-playlist]');
    if (addButton) {
      const playlist = playlists.find((item) => item.id === addButton.dataset.addPlaylist);
      if (!playlist) return;
      if (!playlist.songs.includes(currentSong().id)) playlist.songs.push(currentSong().id);
      writeStorage('pulse-playlists', playlists); renderPlaylists(); showToast(`Added to “${playlist.name}”`);
    } else if (deleteButton) {
      const playlist = playlists.find((item) => item.id === deleteButton.dataset.deletePlaylist);
      if (!playlist || !window.confirm(`Delete the “${playlist.name}” playlist?`)) return;
      playlists = playlists.filter((item) => item.id !== playlist.id);
      writeStorage('pulse-playlists', playlists); renderPlaylists(); showToast('Playlist deleted');
    }
  }
  els.saved.addEventListener('click', handlePlaylistAction);
  els.sidebarPlaylists.addEventListener('click', handlePlaylistAction);
  $('#createPlaylistButton').addEventListener('click', openPlaylistDialog);
  $('#quickCreate').addEventListener('click', openPlaylistDialog);
  $('#cancelPlaylist').addEventListener('click', () => els.dialog.close());
  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    createPlaylist(els.playlistInput.value);
    els.playlistInput.value = '';
    els.dialog.close();
  });
  els.theme.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-theme');
    els.theme.textContent = isLight ? '☾' : '☼';
    els.theme.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
    writeStorage('pulse-theme', isLight ? 'light' : 'dark');
  });
  const savedTheme = readStorage('pulse-theme', 'dark');
  if (savedTheme === 'light') { document.body.classList.add('light-theme'); els.theme.textContent = '☾'; els.theme.setAttribute('aria-label', 'Switch to dark theme'); }
  document.addEventListener('keydown', (event) => {
    const tag = document.activeElement?.tagName;
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); els.search.focus(); }
    else if (!typing && event.code === 'Space') { event.preventDefault(); togglePlayback(); }
    else if (!typing && event.key === 'ArrowRight' && Number.isFinite(els.audio.duration)) els.audio.currentTime = Math.min(els.audio.duration, els.audio.currentTime + 5);
    else if (!typing && event.key === 'ArrowLeft') els.audio.currentTime = Math.max(0, els.audio.currentTime - 5);
  });
  $('#backButton').addEventListener('click', () => { els.search.value = ''; els.genre.value = 'all'; renderSongs(); });
  $('#forwardButton').addEventListener('click', () => $('#library').scrollIntoView({ behavior: 'smooth' }));

  loadSong(0);
  renderQueue();
  renderPlaylists();
})();
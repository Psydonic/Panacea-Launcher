const status = document.getElementById('status');
const progress = document.getElementById('progress');

window.electronAPI.onStatus((event, message) => {
    status.innerText = message;
});

window.electronAPI.onProgress((event, progressInfo) => {
    progress.style.display = 'block';
    progress.value = progressInfo.percent;
    status.innerText = `Downloading images: ${Math.round(progressInfo.percent)}%`;
});

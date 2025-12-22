const status = document.getElementById('status');
const progress = document.getElementById('progress');

/**
 * Handles the 'status' event from the main process.
 * @param {import('electron').IpcRendererEvent} event - The event object.
 * @param {string} message - The status message.
 */
window.electronAPI.onStatus((event, message) => {
    status.innerText = message;
});

/**
 * Handles the 'progress' event from the main process.
 * @param {import('electron').IpcRendererEvent} event - The event object.
 * @param {{percent: number}} progressInfo - The progress information.
 */
window.electronAPI.onProgress((event, progressInfo) => {
    progress.style.display = 'block';
    progress.value = progressInfo.percent;
    status.innerText = `Downloading images: ${Math.round(progressInfo.percent)}%`;
});

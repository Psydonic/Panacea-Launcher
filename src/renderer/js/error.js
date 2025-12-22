const error = document.getElementById('error');
/**
 * Handles the 'error' event from the main process.
 * @param {import('electron').IpcRendererEvent} event - The event object.
 * @param {string} message - The error message.
 */
window.electronAPI.onError((event, message) => {
    error.innerText = message;
});

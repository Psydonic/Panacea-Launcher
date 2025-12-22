const status = document.getElementById('status');
window.electronAPI.onStatus((event, message) => {
    status.innerText = message;
});

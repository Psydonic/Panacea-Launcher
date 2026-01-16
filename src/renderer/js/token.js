document.addEventListener('DOMContentLoaded', () => {
  const patInput = document.getElementById('patInput');
  const submitButton = document.getElementById('submitPat');
  const errorMessage = document.getElementById('errorMessage');

  const tokenTitle = document.getElementById('tokenTitle');

  const handleInitialError = (message) => {
    errorMessage.textContent = message;
    tokenTitle.textContent = "Authentication Failed";
    // Re-enable the button if an error occurs
    submitButton.disabled = false;
    submitButton.textContent = 'Submit';
    patInput.value = '';
    patInput.focus();
  };
  
  // Listen for an initial error message from the main process
  window.api.onInitialError((message) => {
    handleInitialError(message);
  });

  submitButton.addEventListener('click', () => {
    const pat = patInput.value.trim();
    if (pat) {
      errorMessage.textContent = '';
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';
      window.api.submitToken(pat);
    } else {
      errorMessage.textContent = 'Please enter your GitHub PAT.';
    }
  });

  patInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      submitButton.click();
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const patInput = document.getElementById('patInput');
  const usernameInput = document.getElementById('usernameInput');
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
    usernameInput.value = '';
    usernameInput.focus();
  };
  
  // Listen for an initial error message from the main process
  window.api.onInitialError((message) => {
    handleInitialError(message);
  });

  submitButton.addEventListener('click', () => {
    const pat = patInput.value.trim();
    const username = usernameInput.value.trim();
    if (pat && username) {
      errorMessage.textContent = '';
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';
      window.api.submitToken(username, pat);
    } else {
      errorMessage.textContent = 'Please enter your GitHub PAT.';
    }
  });

  [usernameInput, patInput].forEach((input) => {
    input.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        submitButton.click();
      }
    });
  });
});

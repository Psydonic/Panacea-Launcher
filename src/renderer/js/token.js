document.addEventListener('DOMContentLoaded', () => {
  const patInput = document.getElementById('patInput');
  const submitButton = document.getElementById('submitPat');
  const errorMessage = document.getElementById('errorMessage');

  submitButton.addEventListener('click', async () => {
    const pat = patInput.value.trim();
    if (pat) {
      errorMessage.textContent = '';
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';

      const success = await window.api.submitToken(pat);
      if (success) {
        // Token submitted and accepted, window will be closed by main process
      } else {
        errorMessage.textContent = 'Invalid token or login failed. Please try again.';
        submitButton.disabled = false;
        submitButton.textContent = 'Submit';
        patInput.value = ''; // Clear input on failure
        patInput.focus();
      }
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

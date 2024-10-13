let documentText = '';
let chatHistory = [];
let isSubmitting = false; // Flag to prevent multiple submissions

// Function to extract text from PDF
async function extractTextFromPDF(pdfUrl) {
  const pdfjsLib = window['pdfjs-dist/build/pdf'];
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.8.335/pdf.worker.min.js';

  const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
  let textContent = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const text = await page.getTextContent();
    textContent += text.items.map(item => item.str).join(' ') + '\n';
  }

  return textContent;
}

// Function to load documents
async function loadDocuments() {
  const pdfUrls = [
    "./SPJMR_HANDBOOK_2024.pdf"
  ];

  for (const url of pdfUrls) {
    const text = await extractTextFromPDF(url);
    documentText += text + '\n';
  }
}

// Function to toggle the chat modal visibility
function toggleChat() {
  const chatModal = document.getElementById('chat-modal');
  chatModal.style.display = chatModal.style.display === 'block' ? 'none' : 'block';
}

// Function to update chat history in the modal
function updateChatHistory() {
  const chatHistoryDiv = document.getElementById('chat-history');
  chatHistoryDiv.innerHTML = ""; // Clear previous messages

  chatHistory.forEach(message => {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + (message.role === 'user' ? 'user-message' : 'assistant-message');
    messageDiv.textContent = message.content;
    chatHistoryDiv.appendChild(messageDiv);
  });

  chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight; // Scroll to the bottom
}

// Function to simulate typing effect for assistant's response
function typeOutResponse(response) {
  const chatHistoryDiv = document.getElementById('chat-history');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant-message';
  chatHistoryDiv.appendChild(messageDiv);

  let index = 0;
  const typingSpeed = 10; // Speed of typing in milliseconds

  function type() {
    if (index < response.length) {
      messageDiv.textContent += response.charAt(index);
      index++;
      setTimeout(type, typingSpeed);
    } else {
      chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight; // Scroll to the bottom after typing is complete
    }
  }

  type(); // Start typing
}

// Function to send document text and user question to OpenAI
async function submitQuestion() {
  if (isSubmitting) return; // Prevent further submissions
  isSubmitting = true; // Set flag to true

  const userQuestion = document.getElementById('user-question').value;

  if (!documentText || !userQuestion) {
    alert("Please wait for the PDFs to load and ask a question.");
    isSubmitting = false; // Reset flag
    return;
  }

  const apiKey = "sk-HUifBkk4XPhJlkREQgBvnz_dX0lbh0NDNWu_WHl2RhT3BlbkFJB8jlkIo8ByFYp1qoyE9S8nkniZRh8nNOcFt10j8QUA"; // Replace with your OpenAI API key
  const messages = [
    { role: 'system', content: 'You are a helpful assistant that answers questions based on the provided document.' },
    { role: 'system', content: `Document content:\n${documentText}` },
    { role: 'user', content: userQuestion }
  ];

  // Show loading spinner in the modal
  const loadingDiv = document.getElementById('loading');
  loadingDiv.style.display = 'block';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',  // or use 'gpt-4' if available
        messages: messages,
        max_tokens: 200
      }),
    });

    const data = await response.json();
    const assistantResponse = data.choices[0].message.content;

    // Only push to chat history if the response is valid
    if (assistantResponse) {
      // Add the user question to chat history
      chatHistory.push({ role: 'user', content: userQuestion });

      // Update chat history on the page
      updateChatHistory(); // Display chat history

      // Type out the assistant's response
      typeOutResponse(assistantResponse); // Animate typing effect
      chatHistory.push({ role: 'assistant', content: assistantResponse });
    } else {
      alert('Assistant response is empty. Please try again.');
    }

    document.getElementById('user-question').value = ""; // Clear the input
  } catch (error) {
    console.error("Error fetching response from OpenAI:", error);
    alert('Error fetching response.');
  } finally {
    // Hide loading spinner in the modal
    loadingDiv.style.display = 'none';
    isSubmitting = false; // Reset flag in the end
  }
}

// Function to submit question when Enter is pressed
function handleKeyPress(event) {
  if (event.key === 'Enter') {
    submitQuestion();
  }
}

// Add event listener for keypress
document.getElementById('user-question').addEventListener('keypress', handleKeyPress);

// Load documents when the page loads
window.onload = loadDocuments;

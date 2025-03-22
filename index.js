let documentText = "";
let chatHistory = [];
let isSubmitting = false; 

// Function to extract text from PDF
async function extractTextFromPDF(pdfUrl) {
  try {
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    let textContent = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const text = await page.getTextContent();

      console.log(`Page ${i} Text:`, text.items); // Debugging Output

      if (!text.items || text.items.length === 0) {
        console.error(`No text found on page ${i}`);
      }

      textContent += text.items.map((item) => item.str).join(" ") + "\n";
    }

    return textContent;
  } catch (error) {
    console.error("Error extracting text:", error);
    return "";
  }
}

// Function to load documents
async function loadDocuments() {
  const pdfUrls = ["./BNS.pdf"];

  for (const url of pdfUrls) {
    const text = await extractTextFromPDF(url);
    documentText += text + "\n";
  }
}

// Function to toggle the chat modal visibility
function toggleChat() {
  const chatModal = document.getElementById("chat-modal");
  chatModal.style.display =
    chatModal.style.display === "block" ? "none" : "block";
}

// Function to update chat history in the modal
function updateChatHistory() {
  const chatHistoryDiv = document.getElementById("chat-history");
  chatHistoryDiv.innerHTML = ""; // Clear previous messages

  chatHistory.forEach((message) => {
    const messageDiv = document.createElement("div");
    messageDiv.className =
      "message " +
      (message.role === "user" ? "user-message" : "assistant-message");
    messageDiv.textContent = message.content;
    chatHistoryDiv.appendChild(messageDiv);
  });

  chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight; // Scroll to the bottom
}

// Function to simulate typing effect for assistant's response
function typeOutResponse(response) {
  const chatHistoryDiv = document.getElementById("chat-history");
  const messageDiv = document.createElement("div");
  messageDiv.className = "message assistant-message";
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

async function submitQuestion() {
  if (isSubmitting) return; // Prevent multiple submissions
  isSubmitting = true; // Set flag

  const userQuestion = document.getElementById("user-question").value.trim();

  if (!documentText || !userQuestion) {
    alert("Please wait for the PDFs to load and ask a question.");
    isSubmitting = false;
    return;
  }

  const apiKey =
    "xxxxxxxxxxxxxx"; // Replace with your OpenAI API key

  // 🔹 Step 1: Ensure documentText is within token limits
  const maxTokens = 4000; // Adjust based on OpenAI model limit
  let trimmedText = documentText.substring(0, maxTokens); // Truncate if too long

  // 🔹 Step 2: Summarize document if it's too large
  if (documentText.length > maxTokens) {
    trimmedText = await summarizeDocument(documentText);
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a helpful assistant that answers questions based on the provided document.",
    },
    { role: "system", content: `Document Summary:\n${trimmedText}` },
    { role: "user", content: userQuestion },
  ];

  // Show loading spinner
  const loadingDiv = document.getElementById("loading");
  loadingDiv.style.display = "block";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Use gpt-4 if available
        messages: messages,
        max_tokens: 500, // Adjust as needed
      }),
    });

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("Unexpected OpenAI response format.");
    }

    const assistantResponse = data.choices[0].message.content;

    // Only push to chat history if response is valid
    if (assistantResponse) {
      chatHistory.push({ role: "user", content: userQuestion });
      updateChatHistory(); // Display chat history
      typeOutResponse(assistantResponse); // Animate typing effect
      chatHistory.push({ role: "assistant", content: assistantResponse });
    } else {
      alert("Assistant response is empty. Please try again.");
    }

    document.getElementById("user-question").value = ""; // Clear input
  } catch (error) {
    console.error("Error fetching response from OpenAI:", error);
    alert("Error fetching response.");
  } finally {
    loadingDiv.style.display = "none"; // Hide loading spinner
    isSubmitting = false; // Reset flag
  }
}

// 🔹 Function to Summarize Large Documents Before Sending
async function summarizeDocument(text) {
  try {
    const apiKey =
      "xxxxxxxxxxxxxxxxxxxxxxx"; // Replace with your OpenAI API key
    const summaryResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "Summarize the following document in 500 words:\n\n" + text,
            },
          ],
          max_tokens: 500,
        }),
      }
    );

    const summaryData = await summaryResponse.json();
    return summaryData.choices[0]?.message?.content || text.substring(0, 3000); // Fallback
  } catch (error) {
    console.error("Error summarizing document:", error);
    return text.substring(0, 3000); // Fallback
  }
}

// Function to submit question when Enter is pressed
function handleKeyPress(event) {
  if (event.key === "Enter") {
    submitQuestion();
  }
}

// Add event listener for keypress
document
  .getElementById("user-question")
  .addEventListener("keypress", handleKeyPress);

// Load documents when the page loads
window.onload = loadDocuments;

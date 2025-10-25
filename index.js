import { GoogleGenAI } from "@google/genai";

// --- DOM Elements ---
const titleInput = document.getElementById('title-input');
const styleSelect = document.getElementById('style-select');
const generateButton = document.getElementById('generate-button');
const downloadButton = document.getElementById('download-button');
const imageContainer = document.getElementById('image-container');

// --- State ---
let currentImageUrl = null;
let isLoading = false;

// --- HTML Snippets ---
const placeholderHTML = `<p class="text-gray-500">ここに画像が出力されます</p>`;
const spinnerHTML = `
  <div class="text-center">
    <div class="border-4 border-gray-500 border-t-purple-500 rounded-full w-12 h-12 animate-spin mx-auto"></div>
    <p class="mt-4 text-gray-400">AIが画像を生成中です...</p>
  </div>`;

// --- Gemini API Setup ---
let ai;
if (process.env.API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

const styleToPromptMap = {
  '可愛い': 'Extremely cute and adorable anime style, kawaii, moe, soft colors, sparkling eyes, for a heartwarming story.',
  'カッコいい': 'Dynamic and cool anime style, sharp lines, action-packed scene, intense lighting, stylish character design, for an action or fantasy story.',
  'リアル': 'Highly detailed and realistic anime style, cinematic lighting, photorealistic textures, mature character designs, for a serious drama or sci-fi story.',
  'パンク': 'Cyberpunk or punk rock anime style, neon lights, gritty urban environment, rebellious attitude, futuristic gadgets, for a dystopian or sci-fi story.',
};

// --- Functions ---

function setUIState(loading) {
  isLoading = loading;
  titleInput.disabled = loading;
  styleSelect.disabled = loading;
  generateButton.disabled = loading || !titleInput.value.trim();
  downloadButton.disabled = loading || !currentImageUrl;

  if (loading) {
    generateButton.textContent = '生成中...';
    imageContainer.innerHTML = spinnerHTML;
  } else {
    generateButton.textContent = '画像を生成';
    if (!currentImageUrl && !imageContainer.querySelector('.text-red-400')) {
        imageContainer.innerHTML = placeholderHTML;
    }
  }
}

function showError(message) {
  currentImageUrl = null;
  imageContainer.innerHTML = `
    <div class="p-4 text-center text-red-400">
      <p>エラーが発生しました:</p>
      <p class="font-mono text-sm mt-2 break-all">${message}</p>
    </div>`;
}

function showImage(url) {
  currentImageUrl = url;
  imageContainer.innerHTML = `<img src="${url}" alt="生成された画像" class="w-full h-full object-cover" />`;
}

async function handleGenerate() {
  const title = titleInput.value.trim();
  const style = styleSelect.value;

  if (!title) {
    showError('タイトルを入力してください。');
    return;
  }
  
  if (!ai) {
    showError("API_KEYが設定されていません。");
    return;
  }

  setUIState(true);
  currentImageUrl = null;

  const styleDescription = styleToPromptMap[style];
  const prompt = `Create a high-quality, professional anime-style image suitable for a video thumbnail. The theme is "${title}". The specific art style should be: ${styleDescription}. The image must be visually striking, with vibrant colors and a clean composition. It should not contain any text.`;

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
      showImage(imageUrl);
    } else {
      throw new Error("AIから画像が返されませんでした。");
    }
  } catch (error) {
    console.error("Gemini APIエラー:", error);
    const message = error instanceof Error ? error.message : "画像の生成中にエラーが発生しました。";
    showError(message);
  } finally {
    setUIState(false);
  }
}

function handleDownload() {
  if (!currentImageUrl) return;
  const link = document.createElement('a');
  link.href = currentImageUrl;
  const safeTitle = titleInput.value.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.download = `サムネイル_${safeTitle || 'image'}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- Event Listeners ---
generateButton.addEventListener('click', handleGenerate);
downloadButton.addEventListener('click', handleDownload);
titleInput.addEventListener('input', () => {
  if (!isLoading) {
    generateButton.disabled = !titleInput.value.trim();
  }
});

// --- Initial State ---
function initialize() {
    imageContainer.innerHTML = placeholderHTML;
    generateButton.disabled = true;
}

initialize();

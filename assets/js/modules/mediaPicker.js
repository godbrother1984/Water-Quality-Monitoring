import { state } from './state.js';
import { getYoutubeVideoId } from './helpers.js';

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const mediaPicker = {
    createImagePicker(containerEl, configKey, mediaType = 'image') {
        const acceptType = mediaType === 'video' ? 'video/*' : 'image/*,video/*';

        containerEl.innerHTML = `
            <div class="image-picker-container border p-4 rounded-lg bg-gray-50 space-y-3">
                <!-- Preview Area -->
                <div class="preview-container hidden w-full h-48 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                    <img class="preview-image max-w-full max-h-full object-contain" src="">
                    <video class="preview-video max-w-full max-h-full" controls src=""></video>
                    <span class="preview-message text-gray-500"></span>
                </div>

                <!-- Input & Progress Area -->
                <div class="input-area">
                     <label class="block text-sm font-medium mb-1">Upload File</label>
                     <input type="file" class="image-picker-input-file block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none" accept="${acceptType}">
                     <p class="text-xs text-gray-500 mt-1">ขนาดสูงสุด: ${MAX_FILE_SIZE_MB}MB</p>
                </div>
                
                <div class="progress-container hidden mt-2">
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="progress-bar bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
                    </div>
                    <span class="progress-text text-xs text-gray-600"></span>
                </div>
                
                <!-- URL input as an alternative -->
                <div>
                     <label class="block text-sm font-medium mb-1">Or enter URL</label>
                     <input type="url" class="settings-input image-picker-input-url w-full" placeholder="https://example.com/media.png">
                </div>

                <!-- Hidden input to store the final URL -->
                <input type="hidden" class="final-media-url" data-type="url" value="">

                 <!-- Error Message Area -->
                <p class="error-message text-xs text-red-600 h-4"></p>
            </div>
        `;
        
        const fileInput = containerEl.querySelector('.image-picker-input-file');
        const urlInput = containerEl.querySelector('.image-picker-input-url');
        const hiddenUrlInput = containerEl.querySelector('.final-media-url');

        urlInput.addEventListener('input', () => {
            hiddenUrlInput.value = urlInput.value;
            hiddenUrlInput.dataset.type = 'url';
            this.updatePreview(containerEl);
            state.setSettingsChanged(true);
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const errorMessageEl = containerEl.querySelector('.error-message');
            errorMessageEl.textContent = '';
            if (file.size > MAX_FILE_SIZE_BYTES) {
                errorMessageEl.textContent = `ไฟล์มีขนาดใหญ่เกิน ${MAX_FILE_SIZE_MB}MB`;
                fileInput.value = '';
                return;
            }

            this.updatePreview(containerEl, file);
            this.uploadFile(containerEl, file);
            state.setSettingsChanged(true);
        });
    },

    updatePreview(containerEl, file = null) {
        const previewContainer = containerEl.querySelector('.preview-container');
        const imgEl = containerEl.querySelector('.preview-image');
        const videoEl = containerEl.querySelector('.preview-video');
        const msgEl = containerEl.querySelector('.preview-message');
        const hiddenUrlInput = containerEl.querySelector('.final-media-url');
        const urlInput = containerEl.querySelector('.image-picker-input-url');
        
        imgEl.style.display = 'none';
        videoEl.style.display = 'none';
        videoEl.src = '';
        imgEl.src = '';
        msgEl.textContent = '';
        previewContainer.classList.add('hidden');

        let source = file ? URL.createObjectURL(file) : urlInput.value || hiddenUrlInput.value;
        if (!source) return;

        previewContainer.classList.remove('hidden');

        const youtubeId = getYoutubeVideoId(source);

        if (youtubeId) {
            imgEl.style.display = 'block';
            imgEl.src = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
            videoEl.style.display = 'none';
        } else if (file ? file.type.startsWith('video/') : /\.(mp4|webm|ogg)$/i.test(source)) {
            videoEl.style.display = 'block';
            videoEl.src = source;
            imgEl.style.display = 'none';
        } else {
            imgEl.style.display = 'block';
            imgEl.src = source;
            videoEl.style.display = 'none';
        }
    },

    uploadFile(containerEl, file) {
        const progressContainer = containerEl.querySelector('.progress-container');
        const progressBar = containerEl.querySelector('.progress-bar');
        const progressText = containerEl.querySelector('.progress-text');
        const errorMessageEl = containerEl.querySelector('.error-message');
        const hiddenUrlInput = containerEl.querySelector('.final-media-url');

        progressContainer.classList.remove('hidden');
        errorMessageEl.textContent = '';
        
        const formData = new FormData();
        formData.append('file', file);
        
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBar.style.width = percentComplete + '%';
                progressText.textContent = `Uploading... ${Math.round(percentComplete)}%`;
            }
        });
        
        xhr.addEventListener('load', () => {
            progressText.textContent = 'Processing...';
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        progressText.textContent = 'Upload complete!';
                        hiddenUrlInput.value = response.url;
                        hiddenUrlInput.dataset.type = 'uploaded';
                    } else {
                        throw new Error(response.error || 'Unknown server error.');
                    }
                } catch (err) {
                     errorMessageEl.textContent = 'Error parsing server response.';
                     progressContainer.classList.add('hidden');
                }
            } else {
                errorMessageEl.textContent = `Upload failed: ${xhr.statusText}`;
                progressContainer.classList.add('hidden');
            }
        });

        xhr.addEventListener('error', () => {
            errorMessageEl.textContent = 'Network error during upload.';
            progressContainer.classList.add('hidden');
        });
        
        xhr.open('POST', 'api/upload_handler.php', true);
        xhr.send(formData);
    },

    async getImagePickerValue(containerEl) {
        const hiddenUrlInput = containerEl.querySelector('.final-media-url');
        if (!hiddenUrlInput) return { type: 'url', value: '' };
        return { type: 'url', value: hiddenUrlInput.value };
    },

    setImagePickerValue(containerEl, config) {
        if (!config || !containerEl) return;
        
        const hiddenUrlInput = containerEl.querySelector('.final-media-url');
        const urlInput = containerEl.querySelector('.image-picker-input-url');

        if (hiddenUrlInput && urlInput) {
            const value = config.value || '';
            hiddenUrlInput.value = value;
            urlInput.value = value;
            hiddenUrlInput.dataset.type = config.type || 'url';
            this.updatePreview(containerEl);
        }
    }
};

const MAX_VIEW_LIMIT = 2; 

const storage = chrome.storage.local;

function getVideoIdFromHref(href) {
    if (!href || href.length <= 9) {
        return null;
    }

    let idSegment = href.substring(9);

    // Find the index of the first ampersand (&)
    const ampersandIndex = idSegment.indexOf('&');
    // If an ampersand is found, trim the string there.
    if (ampersandIndex !== -1) {
        idSegment = idSegment.substring(0, ampersandIndex);
    }
    return idSegment || null;
}

// run it for each video ytd-rich-item-renderer tag
function processVideoElement(itemRenderer, videoHistory, hiddenVideos) {
    const linkElement = itemRenderer.querySelector('a[href^="/watch?v="]');
    if (!linkElement) return;
    
    const videoId = getVideoIdFromHref(linkElement.getAttribute('href'));
    
    if (videoId) {
        const currentViews = videoHistory[videoId] || 0;
        if (currentViews >= MAX_VIEW_LIMIT) {
            itemRenderer.style.display = 'none';
            hiddenVideos[videoId] = true;
        }
        videoHistory[videoId] = currentViews + 1;
    }
}


async function processVideos() {
    const r = await storage.get(["counter", "hidden"]);
    const videoHistory = r["counter"] || {};
    const hiddenVideos = r["hidden"] || {};

    const videoElements = document.querySelectorAll('ytd-rich-item-renderer');

    videoElements.forEach(itemRenderer => {
        processVideoElement(itemRenderer, videoHistory, hiddenVideos);
    });

    await storage.set({ 
        "counter": videoHistory,
        "hidden": hiddenVideos
    });
}

// Ensure the script runs only when the DOM is fully loaded and ready
// The content script runs on page load, but we wait a short moment for YouTube's
// dynamic content to fully render
window.onload = () => {
    // Use a slight delay to ensure dynamic content has loaded
    setTimeout(processVideos, 1500);
};

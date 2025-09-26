const MAX_VIEW_LIMIT = 2;
const TAG_NAME = 'ytd-rich-item-renderer';

const storage = chrome.storage.local;
const videoHistory = {};
const hiddenVideos = {};


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
        //currentViews tracks how many times the video has came into view regardless of hiding
    }
}
///// Intersection Observer setup
const intersectionOptions = {
    root: null, // The viewport
    rootMargin: '0px',
    threshold: 1.0 // 100% visibility required
};
const intersectionObserverCallback = (entries, observer) => {
    entries.forEach(entry => {
        const tag = entry.target;

        // Check if the element is 100% visible
        if (entry.isIntersecting && entry.intersectionRatio === 1.0) {          
            processVideoElement(tag, videoHistory, hiddenVideos);
            observer.unobserve(tag);
        }
    });
};
const visibilityObserver = new IntersectionObserver(intersectionObserverCallback, intersectionOptions);

///// Mutation Observer setup
const mutationObserverCallback = (mutationsList, observer) => {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            // Iterate over all newly added nodes
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.tagName === TAG_NAME) {
                    // Start tracking the new element
                    visibilityObserver.observe(node);
                }
            });
        }
    }
};
const domChangeObserver = new MutationObserver(mutationObserverCallback);

function monitorParent(parentDiv) {
    if (!parentDiv || parentDiv.nodeType !== 1) {
        console.error("Monitor: Invalid parent DOM element provided.");
        return;
    }

    const initialTags = parentDiv.querySelectorAll(TAG_NAME);
    
    initialTags.forEach(tag => {
        visibilityObserver.observe(tag);
    });

    const mutationOptions = { 
        childList: true, // Watch for children being added or removed
        subtree: false // Only watch direct children important for performance
    };

    domChangeObserver.observe(parentDiv, mutationOptions);
    console.log("Mutation Observer started on parent tag.");
}

async function initApp() {
    const storageData = await storage.get(["counter", "hidden"]);
    videoHistory = storageData["counter"] || {};
    hiddenVideos = storageData["hidden"] || {};

    window.addEventListener('load', () => {
        const parentDiv = document.getElementById('contents');
        monitorParent(parentDiv);
    });
}

initApp();

// Save state before the page unloads
window.onbeforeunload = async () => {
    console.log("Saving state before unload...");
    await storage.set({ 
        "counter": videoHistory,
        "hidden": hiddenVideos
    });
    console.log("State saved.");
    visibilityObserver.disconnect();
    domChangeObserver.disconnect();
}
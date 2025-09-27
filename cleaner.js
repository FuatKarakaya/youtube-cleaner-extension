const MAX_VIEW_LIMIT = 2;
const TAG_NAME = 'ytd-rich-item-renderer';

const storage = chrome.storage.local;
let videoHistory = {};
let hiddenVideos = {};
let c= 0;//debug
let storageShouldBeUpdated = false;
    
//debug
function debug(str){
    document.getElementById("center").getElementsByTagName("input")[0].placeholder=str;
}

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
    c++;//debug
    debug(c)
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
        storageShouldBeUpdated=true;
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
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.tagName.toLowerCase() === TAG_NAME) {
                    visibilityObserver.observe(node);
                }
            });
        }
    }
};
const domChangeObserver = new MutationObserver(mutationObserverCallback);

function monitorParent(parentDiv) {
    if (!parentDiv || parentDiv.nodeType !== 1) {
        console.log(parentDiv);
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
}

async function initApp() {
    const storageData = await storage.get(["counter", "hidden"]);
    videoHistory = storageData["counter"] || {};
    hiddenVideos = storageData["hidden"] || {};
    const parentDiv = document.getElementById('contents');
    monitorParent(parentDiv);
}

setTimeout(initApp, 1000);
const UpdateStorage = async() => {
    if(storageShouldBeUpdated){
        try {
            await storage.set({ 
                "counter": videoHistory,
                "hidden": hiddenVideos
            });
            storageShouldBeUpdated = false;
        }catch(e){
            console.log("Failed to Update")
            console.error(e)
        }
    }
    
}

setInterval(UpdateStorage, 3000);

// Clean up observers on page unload
window.addEventListener('beforeunload', () => {
    visibilityObserver.disconnect();
    domChangeObserver.disconnect();
});

//depricated
window.addEventListener('unload', () => {
    visibilityObserver.disconnect();
    domChangeObserver.disconnect();
});
//NOT WORKING: Probably becasue Notification API requires user permission, which is not granted by default in extensions.
chrome.action.onClicked.addListener(async (tab) => {
    const result = await chrome.storage.local.get("hidden");
    const hiddenVideos = result["hidden"] || {};
    const count = Object.keys(hiddenVideos).length;

    //Send a notification to the user
    // Use the current time to ensure the notification ID is unique
    const notificationId = 'cleaner-status-' + Date.now(); 
    const message = `${count} videos are banned.`;
    chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'images/anka-128.png', // You need to add a small icon file (e.g., 128x128)
        title: 'YouTube Cleaner Status',
        message: message,
        priority: 2
    });
    window.alert(message);
});

// This function updates the icon badge text
async function updateBadgeCount() {
    const result = await chrome.storage.local.get("hidden");
    const hiddenVideos = result["hidden"] || {};
    const count = Object.keys(hiddenVideos).length;
    
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#ae2f2fff' }); 
}

updateBadgeCount();

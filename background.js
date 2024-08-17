//makes chrome send over a notification
const sendNotification = () => {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/pomodoro.png',
        title: 'Pomodoro Timer Extension',
        message: 'Time is up! Open the extension to start the next period.'
    });
};
self.addEventListener('message', (event) => {
    if (event.data?.type === 'notify') {
        const { title, body } = event.data.payload;
        self.registration.showNotification(title, {
            body,
            icon: '/icon.png',
            tag: 'incoming-chat',
        });
    }
});

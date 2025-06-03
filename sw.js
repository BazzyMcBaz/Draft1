self.addEventListener('push', function (e) {
  const data = e.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    vibrate: data.vibrate,
    icon: '/icon.png' // Optional
  });
});
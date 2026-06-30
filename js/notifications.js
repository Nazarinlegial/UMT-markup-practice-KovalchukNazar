const notificationRootId = "notification-root";

function ensureNotificationRoot() {
	let root = document.getElementById(notificationRootId);
	if (!root) {
		root = document.createElement("div");
		root.id = notificationRootId;
		root.setAttribute("aria-live", "polite");
		document.body.append(root);
	}

	return root;
}

function buildNotificationElement(message, variant) {
	const element = document.createElement("div");

	element.className = `notification notification--${variant}`;
	element.textContent = message;

	return element;
}

function showNotification(message, variant, dismissMs) {
	const root = ensureNotificationRoot();
	const element = buildNotificationElement(message, variant);
	root.append(element);

	window.setTimeout(() => {
		element.remove();
	}, dismissMs);
}

export function showErrorNotification(message) {
	showNotification(message, "error", 7000);
}

export function showSuccessNotification(message) {
	showNotification(message, "success", 5000);
}

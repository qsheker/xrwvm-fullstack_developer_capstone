document.getElementById("logout")?.addEventListener("click", async () => {
  try {
    const session = await fetch("/djangoapp/session");
    if (!session.ok) throw new Error("Please try again.");
    const token = (await session.json()).csrfToken;
    const response = await fetch("/djangoapp/logout", {
      method: "POST", headers: { "X-CSRFToken": token }
    });
    if (!response.ok) throw new Error("Unable to log out. Please try again.");
    window.location.assign("/");
  } catch (error) {
    const message = document.getElementById("session-error");
    message.textContent = error.message;
    message.className = "alert";
    message.hidden = false;
  }
});

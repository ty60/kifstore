document.addEventListener("DOMContentLoaded", async () => {
  const kifItems = document.querySelectorAll(".kif-item");
  kifItems.forEach((kifItem) => {
    kifItem.onclick = (event) => {
      event.stopPropagation();

      const kifId = kifItem.id.match(/\d+/)[0];
      location.href = `/board/${kifId}`;
    };
  });

  const deleteButtons = document.querySelectorAll(".delete-button");
  deleteButtons.forEach((deleteButton) => {
    deleteButton.onclick = async (event) => {
      event.stopPropagation();

      const kifId = deleteButton.id.match(/\d+/)[0];
      const title = document.getElementById(`title-kifid-${kifId}`).innerText;
      if (!confirm(`「${title}」を削除しますか？`)) {
        return;
      }

      const res = await fetch(`/kif?kifid=${kifId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        location.reload();
      } else {
        console.log("Failed to delete kif");
      }
    };
  });
});

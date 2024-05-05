document.addEventListener("DOMContentLoaded", async () => {
  const kifItems = document.querySelectorAll(".kif-item");
  kifItems.forEach((kifItem) => {
    kifItem.onclick = () => {
      const kifId = kifItem.id.match(/\d+/)[0];
      location.href = `/replay/${kifId}`;
    };
  });
});

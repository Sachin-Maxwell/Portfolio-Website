document.querySelectorAll(".projects-box").forEach(box => {
    const video = box.querySelector(".project-video");
  
    box.addEventListener("mouseover", () => {
      video.play();
    });
  
    box.addEventListener("mouseleave", () => {
      video.pause();
      video.currentTime = 0; // Reset video to start
    });
  });

  
  

  
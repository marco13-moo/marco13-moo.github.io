const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      entry.target.classList.remove('hidden'); // ensure hidden is removed
      observer.unobserve(entry.target);        // animate once
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.section').forEach(section => observer.observe(section));
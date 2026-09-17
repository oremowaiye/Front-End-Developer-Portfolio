const reveal = () => {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px' });

  items.forEach((el, i) => {
    el.style.setProperty('--d', `${(i % 6) * 80}ms`);
    io.observe(el);
  });
};

const stagger = () => {
  document.querySelectorAll('.run .line').forEach((el, i) => {
    el.style.setProperty('--d', `${300 + i * 190}ms`);
  });
};

document.addEventListener('DOMContentLoaded', () => {
  stagger();
  reveal();
});

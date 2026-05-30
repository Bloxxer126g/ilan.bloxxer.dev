// RentARAM shared utilities
// ── Toast ──
function toast(msg, duration = 3000) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), duration);
}

// ── Active nav link ──
document.addEventListener('DOMContentLoaded', () => {
  const page = location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === page || a.getAttribute('href') === page + 'index.html') a.classList.add('active');
  });
});

// ── Shared nav HTML ──
const NAV_HTML = `
<nav>
  <a href="/rent-a-ram/index.html" class="logo">RENT<span>-A-</span>RAM</a>
  <div class="nav-links">
    <a href="/rent-a-ram/index.html">HOME</a>
    <a href="/rent-a-ram/pricing.html">PRICING</a>
    <a href="/rent-a-ram/order.html">ORDER</a>
    <a href="/rent-a-ram/dashboard.html">DASHBOARD</a>
    <a href="/rent-a-ram/faq.html">FAQ</a>
    <a href="/rent-a-ram/contact.html">CONTACT</a>
  </div>
</nav>`;

const FOOTER_HTML = `
<footer>
  * uptime guarantee subject to vibes<br>
  ** RAM is wiped after rental. Mostly.<br>
  *** RentARAM Ltd is not liable for memory leaks, data loss, or existential crises.<br>
  © 2026 RentARAM Ltd &nbsp;|&nbsp; No refunds. Ever. &nbsp;|&nbsp; <span class="blink">_</span>
</footer>`;

// Inject nav + footer if placeholders exist
document.addEventListener('DOMContentLoaded', () => {
  const navEl = document.getElementById('nav-placeholder');
  if (navEl) navEl.outerHTML = NAV_HTML;
  const footerEl = document.getElementById('footer-placeholder');
  if (footerEl) footerEl.outerHTML = FOOTER_HTML;

  // Re-run active link highlight after injection
  const page = location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === page || a.getAttribute('href') === page + 'index.html') a.classList.add('active');
  });
});

// ── Pricing config ──
const PRICE_PER_GB_HOUR = 100;

function calcTotal(gb, hours) {
  return gb * hours * PRICE_PER_GB_HOUR;
}

function formatMoney(n) {
  return '$' + n.toLocaleString();
}

// ── Fake order store (sessionStorage) ──
function saveOrder(order) {
  const orders = getOrders();
  order.id = 'RAR-' + Math.random().toString(36).slice(2,8).toUpperCase();
  order.placedAt = new Date().toISOString();
  order.status = 'ACTIVE';
  orders.unshift(order);
  sessionStorage.setItem('rar_orders', JSON.stringify(orders));
  return order.id;
}

function getOrders() {
  try { return JSON.parse(sessionStorage.getItem('rar_orders')) || []; }
  catch { return []; }
}

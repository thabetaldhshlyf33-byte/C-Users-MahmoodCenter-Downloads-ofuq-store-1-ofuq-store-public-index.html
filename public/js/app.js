const $ = selector => document.querySelector(selector);
const state = { products: [], categories: [], cart: JSON.parse(localStorage.getItem('ofuq_cart') || '[]'), category: 0, search: '', token: localStorage.getItem('ofuq_token') || '', user: null };
const money = value => new Intl.NumberFormat('ar-YE', { maximumFractionDigits: 0 }).format(Number(value || 0)) + ' ر.ي';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastTimer;
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3000); }
function openModal(html) { $('#modalContent').innerHTML = html; $('#modalBackdrop').classList.remove('hidden'); }
function closeModal() { $('#modalBackdrop').classList.add('hidden'); }
async function api(url, options = {}) {
  const headers = { ...(options.body ? {'Content-Type':'application/json'} : {}), ...(state.token ? {Authorization:`Bearer ${state.token}`} : {}), ...(options.headers || {}) };
  const response = await fetch(url, {...options, headers});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'تعذر تنفيذ الطلب.');
  return data;
}
async function loadStore() {
  try {
    const [categories, products] = await Promise.all([api('/api/categories'), api('/api/products')]);
    state.categories = categories; state.products = products;
    renderCategories(); renderProducts();
  } catch (error) {
    $('#productsGrid').innerHTML = `<div class="loading">تعذر تحميل المنتجات. تأكد من تشغيل الخادم وقاعدة البيانات.<br>${esc(error.message)}</div>`;
  }
  renderCartCount(); $('#year').textContent = new Date().getFullYear();
}
function renderCategories() {
  $('#categoryFilters').innerHTML = `<button class="filter-chip ${state.category===0?'active':''}" data-category="0">كل المنتجات</button>` + state.categories.map(c => `<button class="filter-chip ${state.category===c.id?'active':''}" data-category="${c.id}">${esc(c.name)}</button>`).join('');
}
function renderProducts() {
  const filtered = state.products.filter(p => (!state.category || p.category_id === state.category) && `${p.name} ${p.description||''}`.toLowerCase().includes(state.search.toLowerCase()));
  $('#productsGrid').innerHTML = filtered.map(p => `<article class="product-card">
    <div class="product-image-wrap"><img class="product-image" src="${esc(p.image_url || '')}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='https://placehold.co/600x450/f3f5fa/17243b?text=Ofuq+Store'"><span class="product-tag">${p.stock > 0 ? 'متوفر' : 'نفد المخزون'}</span></div>
    <div class="product-info"><span class="product-category">${esc(p.category_name || 'منتجات أفق')}</span><h3>${esc(p.name)}</h3><p class="product-description">${esc(p.description || 'منتج مميز من متجر أفق.')}</p><div class="product-bottom"><span class="price">${money(p.price_yer)}<small>${p.stock} متوفر</small></span><button class="add-cart" data-add="${p.id}" aria-label="أضف ${esc(p.name)} للسلة" ${p.stock < 1 ? 'disabled' : ''}>+</button></div></div></article>`).join('');
  $('#emptyState').classList.toggle('hidden', filtered.length > 0);
  if (!filtered.length) $('#productsGrid').innerHTML = '';
}
function saveCart() { localStorage.setItem('ofuq_cart', JSON.stringify(state.cart)); renderCartCount(); }
function renderCartCount() { $('#cartCount').textContent = state.cart.reduce((sum, item) => sum + item.quantity, 0); }
function addToCart(id) {
  const product = state.products.find(p => p.id === Number(id));
  if (!product || product.stock < 1) return toast('هذا المنتج غير متوفر حاليًا.');
  const item = state.cart.find(x => x.id === product.id);
  if (item && item.quantity >= product.stock) return toast('وصلت إلى الكمية المتوفرة.');
  if (item) item.quantity++; else state.cart.push({id:product.id, quantity:1});
  saveCart(); toast('تمت إضافة المنتج إلى السلة.');
}
function showCart() {
  const lines = state.cart.map(item => {
    const p = state.products.find(x => x.id === item.id);
    if (!p) return '';
    return `<div class="cart-line"><img src="${esc(p.image_url||'')}" alt=""><div><b>${esc(p.name)}</b><small>${money(p.price_yer)} للقطعة</small><div class="qty-control"><button data-qty="${p.id}" data-delta="-1" aria-label="تقليل">−</button><span>${item.quantity}</span><button data-qty="${p.id}" data-delta="1" aria-label="زيادة" ${item.quantity>=p.stock?'disabled':''}>+</button><button class="text-link" data-remove="${p.id}">حذف</button></div></div><b>${money(p.price_yer*item.quantity)}</b></div>`;
  }).join('');
  const total = state.cart.reduce((sum,item) => { const p=state.products.find(x=>x.id===item.id); return sum+(p? p.price_yer*item.quantity:0); },0);
  openModal(`<h2 id="modalTitle">سلة المشتريات</h2><p class="modal-intro">راجع المنتجات والكميات قبل إرسال الطلب.</p>${lines || '<div class="cart-empty">سلتك فارغة حاليًا. تصفّح المنتجات وأضف ما يعجبك.</div>'}${lines?`<div class="cart-total"><span>الإجمالي التقديري</span><span>${money(total)}</span></div><button id="checkoutBtn" class="btn btn-primary form-submit">إتمام الطلب</button><p class="notice">الدفع الإلكتروني غير مفعّل في هذه النسخة؛ سيُرسل طلبك للمتجر لمراجعته والتواصل معك.</p>`:''}`);
}
function checkoutForm() {
  const total = state.cart.reduce((sum,item)=>{const p=state.products.find(x=>x.id===item.id);return sum+(p?p.price_yer*item.quantity:0)},0);
  openModal(`<h2 id="modalTitle">إتمام الطلب</h2><p class="modal-intro">أدخل بيانات التواصل والتوصيل. الدفع الإلكتروني غير مفعّل.</p><form id="checkoutForm"><div class="form-grid">
  <div class="field"><label for="customerName">الاسم الكامل *</label><input id="customerName" name="customerName" required minlength="2" maxlength="120"></div>
  <div class="field"><label for="customerPhone">رقم الهاتف *</label><input id="customerPhone" name="customerPhone" required minlength="5" maxlength="30" placeholder="77xxxxxxx"></div>
  <div class="field full"><label for="customerEmail">البريد الإلكتروني (اختياري)</label><input id="customerEmail" name="customerEmail" type="email" maxlength="190"></div>
  <div class="field full"><label for="address">عنوان التوصيل بالتفصيل *</label><textarea id="address" name="address" required minlength="5" maxlength="500"></textarea></div>
  <div class="field full"><label for="notes">ملاحظات (اختياري)</label><textarea id="notes" name="notes" maxlength="1000"></textarea></div></div>
  <div class="cart-total"><span>الإجمالي</span><span>${money(total)}</span></div><button class="btn btn-primary form-submit" type="submit">تأكيد وإرسال الطلب</button></form>`);
}
function showAuth(mode='login') {
  const isRegister = mode === 'register';
  openModal(`<h2 id="modalTitle">${isRegister?'إنشاء حساب جديد':'تسجيل الدخول'}</h2><p class="modal-intro">${isRegister?'أنشئ حسابًا لتجربة أفضل في متجر أفق.':'سجّل الدخول إلى حسابك.'}</p>
  <form id="authForm">${isRegister?`<div class="field"><label for="authName">الاسم</label><input id="authName" name="name" required minlength="2" maxlength="120"></div>`:''}
  <div class="field"><label for="authEmail">البريد الإلكتروني</label><input id="authEmail" name="email" type="email" required maxlength="190"></div>
  ${isRegister?`<div class="field"><label for="authPhone">رقم الهاتف (اختياري)</label><input id="authPhone" name="phone" maxlength="30"></div>`:''}
  <div class="field"><label for="authPassword">كلمة المرور ${isRegister?'(8 أحرف على الأقل)':''}</label><input id="authPassword" name="password" type="password" required minlength="${isRegister?8:1}" autocomplete="${isRegister?'new-password':'current-password'}"></div>
  <button class="btn btn-primary form-submit" type="submit">${isRegister?'إنشاء الحساب':'دخول'}</button></form>
  <button id="switchAuth" class="text-link">${isRegister?'لديك حساب؟ سجّل الدخول':'ليس لديك حساب؟ أنشئ حسابًا'}</button>
  <p><a class="admin-link" href="/admin.html">الدخول إلى لوحة الإدارة</a></p>`);
}
async function submitAuth(form) {
  const body = Object.fromEntries(new FormData(form).entries());
  try {
    const data = await api(`/api/auth/${body.name?'register':'login'}`, {method:'POST', body:JSON.stringify(body)});
    state.token = data.token; state.user = data.user; localStorage.setItem('ofuq_token', state.token);
    closeModal(); toast(`مرحبًا ${data.user.name}`);
    $('#accountBtn').textContent = data.user.role==='admin'?'لوحة الإدارة':'حسابي';
    if (data.user.role==='admin') $('#accountBtn').onclick = () => location.href='/admin.html';
  } catch (e) { toast(e.message); }
}
$('#productsGrid').addEventListener('click', e => { const btn=e.target.closest('[data-add]'); if(btn) addToCart(btn.dataset.add); });
$('#categoryFilters').addEventListener('click', e => { const btn=e.target.closest('[data-category]'); if(!btn)return;state.category=Number(btn.dataset.category);renderCategories();renderProducts(); });
$('#searchInput').addEventListener('input', e => {state.search=e.target.value.trim();renderProducts();});
$('#cartBtn').addEventListener('click', showCart);
$('#accountBtn').addEventListener('click', () => state.user?.role==='admin' ? location.href='/admin.html' : showAuth('login'));
$('#closeModal').addEventListener('click', closeModal);
$('#modalBackdrop').addEventListener('click', e => {if(e.target.id==='modalBackdrop')closeModal();});
document.addEventListener('keydown', e => {if(e.key==='Escape')closeModal();});
$('#modalContent').addEventListener('click', e => {
  const qty=e.target.closest('[data-qty]'), remove=e.target.closest('[data-remove]');
  if(qty){const item=state.cart.find(x=>x.id===Number(qty.dataset.qty));const p=state.products.find(x=>x.id===Number(qty.dataset.qty));if(item&&p){item.quantity+=Number(qty.dataset.delta);if(item.quantity<=0)state.cart=state.cart.filter(x=>x.id!==item.id);if(item&&item.quantity>p.stock)item.quantity=p.stock;saveCart();showCart();}}
  if(remove){state.cart=state.cart.filter(x=>x.id!==Number(remove.dataset.remove));saveCart();showCart();}
  if(e.target.closest('#checkoutBtn'))checkoutForm();
  if(e.target.closest('#switchAuth'))showAuth($('#authName')?'login':'register');
});
$('#modalContent').addEventListener('submit', async e => {
  e.preventDefault();const form=e.target;
  if(form.id==='authForm') return submitAuth(form);
  if(form.id==='checkoutForm'){
    const data=Object.fromEntries(new FormData(form).entries());
    data.items=state.cart.map(x=>({id:x.id,quantity:x.quantity}));
    try{const result=await api('/api/orders',{method:'POST',body:JSON.stringify(data)});state.cart=[];saveCart();await loadStore();openModal(`<h2 id="modalTitle">تم استلام طلبك بنجاح</h2><p class="modal-intro">رقم طلبك هو <b>#${result.orderId}</b>.</p><div class="notice">إجمالي الطلب: ${money(result.totalYER)}. سيتواصل معك فريق المتجر لتأكيد التفاصيل.</div><button class="btn btn-primary form-submit" id="doneBtn">متابعة التسوق</button>`);$('#doneBtn').onclick=closeModal;}catch(err){toast(err.message);}
  }
});
loadStore();

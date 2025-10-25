// الشيتات
const SHEET_ID = "2PACX-1vQXW9rev-EPbzS_pXVSa3xoylhsjYwHFE8n0xa9wDoxrkMdFgsn8srViSagCj8kqI-iHpEwpk5w2FuF";
const SHEETS = [
  { name: "Sheet1", gid: "1337227866" },
// مثال
];
let allDevices = [];

// رابط CSV لكل شيت
function getCSVUrl(sheet){ return `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?output=csv&gid=${sheet.gid}`; }

// استخراج الإصدار والتاريخ مع زيادة يوم
function parseURLData(url=""){
  let versionMatch = url.match(/V(\d+(?:\.\d+)?)/i);
  let version = versionMatch ? "V"+versionMatch[1] : "-";
  let dateMatch = url.match(/(\d{8})/);
  let releaseDate="-"; let isNew=false;
  if(dateMatch){
    let d = dateMatch[1];
    let updateDate = new Date(`${d.slice(4,8)}-${d.slice(2,4)}-${d.slice(0,2)}`);
    updateDate.setDate(updateDate.getDate()+1);
    const day = String(updateDate.getDate()).padStart(2,'0');
    const month = String(updateDate.getMonth()+1).padStart(2,'0');
    const year = updateDate.getFullYear();
    releaseDate = `${day}/${month}/${year}`;
    const today = new Date();
    const diffDays = (today - updateDate)/(1000*60*60*24);
    if(diffDays <= 15 && diffDays >=0) isNew=true;
  }
  return {version, releaseDate, isNew};
}

// CSV -> JSON
function parseCSV(csv){
  const rows = csv.split(/\r?\n/).map(r=>r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/));
  const headers = rows[0];
  return rows.slice(1).map(row=>{
    let item={};
    headers.forEach((h,i)=>{ item[h.trim()] = row[i]?row[i].trim().replace(/"/g,""):"-"; });
    const extra = parseURLData(item.url);
    item.version=extra.version; item.date=extra.releaseDate; item.isNew=extra.isNew;
    item.name = item.name || "-"; item.size=item.size||"-"; item.image=item.image||"";
    return item;
  });
}

// جلب كل الشيتات
async function fetchSheets(){
  for(let sheet of SHEETS){
    try{
      const res = await fetch(getCSVUrl(sheet));
      const csv = await res.text();
      allDevices.push(...parseCSV(csv));
    }catch(err){ console.error("فشل جلب:",sheet.name,err); }
  }
  showResults(allDevices);
}

// بعد تحميل كل البيانات، تحقق من ?search= في الرابط
fetchSheets().then(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get('search');
  if(searchQuery){
    searchInput.value = searchQuery; // ضع القيمة في مربع البحث
    searchInput.dispatchEvent(new Event('input')); // شغّل البحث تلقائياً
  }
});

// البحث الحي
document.getElementById("searchInput").addEventListener("input",()=>{
  let q = searchInput.value.trim().toLowerCase();
  let filtered = allDevices.filter(d=> (d.name||"").toLowerCase().includes(q));
  showResults(filtered);
});

// عرض النتائج مع فرز الجديد أولًا
function showResults(list){
  let box = document.getElementById("results");
  box.innerHTML="";
  if(!list.length){ box.innerHTML="<p>لا توجد نتائج</p>"; return; }
  list.sort((a,b)=> a.isNew && !b.isNew?-1: !a.isNew && b.isNew?1:0);
  list.forEach(item=>{
    box.innerHTML+=`
      <div class="card" onclick='showPopup(${JSON.stringify(item).replace(/'/g,"\\'")})'>
      
        ${item.image?`<img src="${item.image}" alt="${item.name}">`:""}
        <div class="card-info">
          <h3>${item.name}</h3>
          <p>الإصدار: ${item.version} | التاريخ: ${item.date}</p>
        </div>
          ${item.isNew?`<span class="new-badge">جديد 🔥</span>`:""}
      </div>
    `;
  });
}

// عرض البطاقة المنبثقة
const overlay = document.getElementById("overlay");
const popupImg = document.getElementById("popupImg");
const popupName = document.getElementById("popupName");
const popupVersion = document.getElementById("popupVersion");
const popupDate = document.getElementById("popupDate");
const popupSize = document.getElementById("popupSize");
const popupDownload = document.getElementById("popupDownload");
const popupWhats = document.getElementById("popupWhats");
const closePopup = document.getElementById("closePopup");

function showPopup(item){
  popupImg.src = item.image || "";
  popupName.textContent = item.name;
  popupVersion.textContent = "الإصدار: " + item.version;
  popupDate.textContent = "تاريخ التحديث: " + item.date;
  popupSize.textContent = "الحجم: " + item.size;
  popupDownload.href = item.url;

  // تعديل رابط واتساب ليشمل المصدر
// رابط واتساب يضع اسم الرسيفر في البحث ضمن الموقع
const searchURL = `${window.location.origin}${window.location.pathname}?search=${encodeURIComponent(item.name)}`;
const whatsappText = `📡 ${item.name}
🔢 الإصدار: ${item.version}
📅 التاريخ: ${item.date}
🔗 الرابط: ${searchURL}`;

popupWhats.href = "https://wa.me/?text=" + encodeURIComponent(whatsappText);


  overlay.classList.add("show");

  // إضافة سجل جديد للرجوع
  history.pushState({popup:true}, "");
}
// زر الإغلاق
closePopup.onclick = closePopupFunc;

// النقر خارج البطاقة
overlay.onclick = e => {
  if(e.target === overlay) closePopupFunc();
}

// زر الرجوع في الجوال
window.addEventListener("popstate", e => {
  if(overlay.classList.contains("show")) overlay.classList.remove("show");
});

function closePopupFunc(){
  overlay.classList.remove("show");
  // إزالة سجل الرجوع إذا كان هذا هو سجل popup
  if(history.state && history.state.popup){
    history.replaceState(null, "");
  }
}
document.getElementById("clearSearch").addEventListener("click", () => {
  window.location.href = "/"; // رابط الصفحة الرئيسية
});

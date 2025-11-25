// --- データ初期化 ---
let clothingData = JSON.parse(localStorage.getItem('clothingData') || '[]')
  .map(item => ({ ...item, wearCount: item.wearCount ?? 0 })); // ★ 着用回数対応

let coordData = JSON.parse(localStorage.getItem('coordData') || '[]');
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

// --- タブ切替 ---
function switchView(id){
  document.querySelectorAll('section').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(id==='coord') updateCoordItems();
  if(id==='calendar') updateCalendar();
  if(id==='list') renderClothingList();
  if(id==='stats') updateStats(); 
}
document.querySelectorAll('.bottom-nav button').forEach(btn=>{
  btn.addEventListener('click', ()=> switchView(btn.dataset.target));
});

// --- 統計タブ表示 ---
function updateStats() {
  const container = document.getElementById('stats-content');
  if (!container) return;

  // 総着用回数
  const totalWear = clothingData.reduce((sum, item) => sum + (item.wearCount || 0), 0);

  // 着用回数が多い順にTop5
  const topItems = [...clothingData]
    .sort((a, b) => (b.wearCount || 0) - (a.wearCount || 0))
    .slice(0, 5);

  container.innerHTML = `
    <p>総着用回数: ${totalWear}回</p>
    <h4>よく着たアイテム Top5</h4>
    <ol>
      ${topItems.map(item => `<li>${item.name} (${item.wearCount}回)</li>`).join('')}
    </ol>
  `;
}

// --- タブ切替に統計呼び出し追加 ---
const originalSwitchView = switchView;
switchView = function(id) {
  originalSwitchView(id);
  if (id === 'stats') updateStats();
};

// --- 画像プレビュー ---
const imageInput = document.getElementById('image-input');
const imagePreview = document.getElementById('image-preview');
imageInput.addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    const img = new Image();
    img.onload = ()=>{
      const canvas = document.createElement('canvas');
      const maxSize = 300;
      let w=img.width,h=img.height;
      if(w>h){ if(w>maxSize){ h*=maxSize/w; w=maxSize; } }
      else{ if(h>maxSize){ w*=maxSize/h; h=maxSize; } }
      canvas.width=w; canvas.height=h;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0,w,h);
      imagePreview.src = canvas.toDataURL('image/jpeg');
      imagePreview.dataset.ready = 'true';
      imagePreview.style.display='block';
    }
    img.src = reader.result;
  }
  reader.readAsDataURL(file);
});

// --- 服追加 ---
document.getElementById('clothing-form').addEventListener('submit', e=>{
  e.preventDefault();
  const f = e.target;
  const seasons = Array.from(f.querySelectorAll('input[name="seasons"]:checked')).map(i=>i.value);
  const newItem = {
    name: f.name.value,
    brand: f.brand.value,
    color: f.color.value,
    category: f.category.value,
    memo: f.memo.value,
    image: imagePreview.src || '',
    seasons: seasons,
    favorite: false,
    wearCount: 0 // ★ 着用回数対応
  };
  clothingData.push(newItem);
  localStorage.setItem('clothingData', JSON.stringify(clothingData));
  f.reset();
  imagePreview.style.display='none';
  renderClothingList();
  switchView('list');
});

// --- 一覧表示 ---
function renderClothingList(data=clothingData){
  const container = document.getElementById('clothing-list');
  container.innerHTML='';
  data.forEach(item=>{
    const div=document.createElement('div');
    div.className='clothing-item';
    const seasonsText = item.seasons && item.seasons.length>0 ? '季節: ' + item.seasons.join(', ') : '';
    div.innerHTML=`
      <img src="${item.image}" class="preview-img">
      <h4>${item.name}</h4>
      <p>${item.brand} / ${item.color} / ${item.category}</p>
      <p>${item.memo}</p>
      <p>${seasonsText}</p>
      <p>着用回数: ${item.wearCount}回</p> <!-- ★ 着用回数表示 -->
      <button class="favorite-btn">${item.favorite ? '★' : '☆'} お気に入り</button>
      <button class="delete-btn">削除</button>
    `;

    div.querySelector('.favorite-btn').addEventListener('click', ()=>{
      item.favorite = !item.favorite;
      localStorage.setItem('clothingData', JSON.stringify(clothingData));
      renderClothingList(data);
    });

    div.querySelector('.delete-btn').addEventListener('click', ()=>{
      if(confirm(`${item.name} を削除してもよろしいですか？`)){
        clothingData = clothingData.filter(i => i !== item);
        localStorage.setItem('clothingData', JSON.stringify(clothingData));
        renderClothingList();
      }
    });

    container.appendChild(div);
  });
}

// --- フィルター ---
document.getElementById('list-filter-apply').addEventListener('click', ()=>{
  const cat=document.getElementById('filter-category').value;
  const color=document.getElementById('filter-color').value.toLowerCase();
  const brand=document.getElementById('filter-brand').value.toLowerCase();
  const selectedSeasons = Array.from(document.querySelectorAll('input[name="filter-season"]:checked')).map(i=>i.value);
  const favOnly = document.getElementById('filter-fav').checked;

  const filtered = clothingData.filter(item=>
    (!cat || item.category===cat) &&
    (!color || item.color.toLowerCase().includes(color)) &&
    (!brand || item.brand.toLowerCase().includes(brand)) &&
    (selectedSeasons.length===0 || item.seasons.some(s=>selectedSeasons.includes(s))) &&
    (!favOnly || item.favorite)
  );
  renderClothingList(filtered);
});

document.getElementById('list-filter-clear').addEventListener('click', ()=>{
  document.getElementById('filter-category').value='';
  document.getElementById('filter-color').value='';
  document.getElementById('filter-brand').value='';
  document.getElementById('filter-fav').checked = false;
  document.querySelectorAll('input[name="filter-season"]').forEach(c=>c.checked=false);
  renderClothingList();
});

// --- コーデ作成カード生成（お気に入り対応） ---
function updateCoordItems(filteredData) {
  const container = document.getElementById('coord-items');
  container.innerHTML = '';

  (filteredData || clothingData).forEach(item => {
    const wrapper = document.createElement('label');
    wrapper.className = 'coord-card';

    // チェックボックス
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = item.name;
    checkbox.className = 'coord-checkbox';

    // 画像
    const imgBox = document.createElement('div');
    imgBox.className = 'coord-img-box';
    const img = document.createElement('img');
    img.src = item.image || '';
    img.alt = item.name;
    imgBox.appendChild(img);

    // 名称
    const name = document.createElement('p');
    name.className = 'coord-name';
    name.textContent = item.name;

    // ブランド
    const brand = document.createElement('p');
    brand.className = 'coord-brand';
    brand.textContent = item.brand;

    // お気に入りボタン
    const favBtn = document.createElement('button');
    favBtn.type = 'button';
    favBtn.className = 'coord-fav-btn';
    favBtn.textContent = item.favorite ? '★' : '☆';
    favBtn.addEventListener('click', e => {
      e.preventDefault();
      item.favorite = !item.favorite;
      localStorage.setItem('clothingData', JSON.stringify(clothingData));
      updateCoordItems(filteredData);
    });

    wrapper.appendChild(checkbox);
    wrapper.appendChild(imgBox);
    wrapper.appendChild(name);
    wrapper.appendChild(brand);
    wrapper.appendChild(favBtn);

    container.appendChild(wrapper);
  });
}

// --- フィルター機能 ---
document.getElementById('coord-filter-apply').addEventListener('click', () => {
  const cat = document.getElementById('coord-filter-category').value;
  const color = document.getElementById('coord-filter-color').value.toLowerCase();
  const brand = document.getElementById('coord-filter-brand').value.toLowerCase();
  const selectedSeasons = Array.from(document.querySelectorAll('input[name="coord-filter-season"]:checked'))
                              .map(c => c.value);
  const favOnly = document.getElementById('coord-filter-fav').checked;

  const filtered = clothingData.filter(item => 
    (!cat || item.category === cat) &&
    (!color || item.color.toLowerCase().includes(color)) &&
    (!brand || item.brand.toLowerCase().includes(brand)) &&
    (selectedSeasons.length === 0 || item.seasons.some(s => selectedSeasons.includes(s))) &&
    (!favOnly || item.favorite)
  );

  updateCoordItems(filtered);
});

document.getElementById('coord-filter-clear').addEventListener('click', () => {
  document.getElementById('coord-filter-category').value = '';
  document.getElementById('coord-filter-color').value = '';
  document.getElementById('coord-filter-brand').value = '';
  document.querySelectorAll('input[name="coord-filter-season"]').forEach(c => c.checked = false);
  document.getElementById('coord-filter-fav').checked = false;
  updateCoordItems();
});

// --- コーデ保存 ---
document.getElementById('coord-form').addEventListener('submit', e => {
  e.preventDefault();
  const selectedItems = Array.from(document.querySelectorAll('#coord-items input[type="checkbox"]:checked'))
                             .map(cb => cb.value);

  if(selectedItems.length === 0){
    alert('少なくとも1つアイテムを選んでください');
    return;
  }

  // ★ 選んだアイテムの着用回数を +1
  selectedItems.forEach(name => {
    const item = clothingData.find(i => i.name === name);
    if(item) item.wearCount = (item.wearCount || 0) + 1;
  });
  localStorage.setItem('clothingData', JSON.stringify(clothingData));

  const newCoord = {
    name: document.getElementById('coord-name').value,
    date: document.getElementById('coord-date').value,
    items: selectedItems
  };

  coordData.push(newCoord);
  localStorage.setItem('coordData', JSON.stringify(coordData));

  alert('コーデを保存しました');
  e.target.reset();
  updateCoordItems();
});

// --- カレンダー ---
function updateCalendar(){
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML='';

  const firstDay = new Date(currentYear,currentMonth,1).getDay();
  const lastDate = new Date(currentYear,currentMonth+1,0).getDate();

  document.getElementById('calendar-title').innerHTML = `${currentYear}<br>${currentMonth+1}月`;

  for(let i=0;i<firstDay;i++) grid.innerHTML+='<div></div>';
  for(let d=1;d<=lastDate;d++){
    const cell=document.createElement('div');
    cell.className='calendar-cell';
    cell.textContent=d;
    const dateStr=`${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cell.addEventListener('click', ()=> showCoordForDate(dateStr));
    grid.appendChild(cell);
  }
}

function showCoordForDate(dateStr){
  const div = document.getElementById('calendar-coord-detail');
  const coords = coordData.filter(c => c.date === dateStr);

  if (coords.length === 0) {
    div.innerHTML = 'この日に作成したコーデはありません。';
    return;
  }

  div.innerHTML = coords.map((c, index) => {
    const itemsHTML = c.items.map(name => {
      const item = clothingData.find(i => i.name === name);
      if (!item) return '';
      return `
        <div class="coord-item">
          <img src="${item.image}" alt="${item.name}">
          <span>${item.name} (${item.brand})</span>
        </div>
      `;
    }).join('');

    return `
      <div class="calendar-coord-detail">
        <strong>${c.name}</strong>

        ${itemsHTML}

        <button class="coord-delete-btn" data-index="${index}" data-date="${dateStr}">
          削除
        </button>
      </div>
    `;
  }).join('');

  // --- 削除ボタンの動作（カレンダー） ---
document.querySelectorAll('.coord-delete-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    const date = e.target.dataset.date;
    const idx = Number(e.target.dataset.index);

    if (!confirm('このコーデを削除しますか？')) return;

    // 指定日のコーデ一覧から対象を取得
    let dailyCoords = coordData.filter(c => c.date === date);
    const target = dailyCoords[idx];

    // 削除対象のコーデに含まれるアイテムの着用回数を -1
    target.items.forEach(name => {
      const item = clothingData.find(i => i.name === name);
      if(item && item.wearCount > 0) item.wearCount -= 1;
    });

    // 全体データから削除
    coordData = coordData.filter(c => c !== target);

    // 保存
    localStorage.setItem('coordData', JSON.stringify(coordData));
    localStorage.setItem('clothingData', JSON.stringify(clothingData));

    // 再描画
    showCoordForDate(date);
    updateCalendar();
    
    // 統計タブがアクティブなら更新
    if(document.getElementById('stats').classList.contains('active')){
      updateStats();
    }
  });
});
}

document.getElementById('prev-month').addEventListener('click', ()=>{
  currentMonth--; if(currentMonth<0){currentMonth=11; currentYear--;} updateCalendar();
});
document.getElementById('next-month').addEventListener('click', ()=>{
  currentMonth++; if(currentMonth>11){currentMonth=0; currentYear++;} updateCalendar();
});

// --- 初期表示 ---
document.addEventListener('DOMContentLoaded', ()=>{
  renderClothingList();
  switchView('list');
});
// --- データ初期化（ローカルストレージ読み込み） ---
    let clothingData = JSON.parse(localStorage.getItem('clothingData') || '[]');
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
    }
    document.querySelectorAll('.bottom-nav button').forEach(btn=>{
      btn.addEventListener('click', ()=> switchView(btn.dataset.target));
    });

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
      const newItem = {
        name: f.name.value,
        brand: f.brand.value,
        color: f.color.value,
        category: f.category.value,
        memo: f.memo.value,
        image: imagePreview.src || ''
      };
      clothingData.push(newItem);
      localStorage.setItem('clothingData', JSON.stringify(clothingData)); // 保存
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
        div.innerHTML=`<img src="${item.image}" class="preview-img">
          <h4>${item.name}</h4>
          <p>${item.brand} / ${item.color} / ${item.category}</p>
          <p>${item.memo}</p>`;
        container.appendChild(div);
      });
    }

    // --- フィルター ---
    document.getElementById('apply-filter-btn').addEventListener('click', ()=>{
      const cat=document.getElementById('filter-category').value;
      const color=document.getElementById('filter-color').value.toLowerCase();
      const brand=document.getElementById('filter-brand').value.toLowerCase();
      const filtered = clothingData.filter(item=>
        (!cat || item.category===cat) &&
        (!color || item.color.toLowerCase().includes(color)) &&
        (!brand || item.brand.toLowerCase().includes(brand))
      );
      renderClothingList(filtered);
    });
    document.getElementById('clear-filter-btn').addEventListener('click', ()=>{
      document.getElementById('filter-category').value='';
      document.getElementById('filter-color').value='';
      document.getElementById('filter-brand').value='';
      renderClothingList();
    });

    // --- コーデ作成 ---
    function updateCoordItems(){
      const container = document.getElementById('coord-items');
      container.innerHTML='';
      clothingData.forEach(item=>{
        const label=document.createElement('label');
        label.style.display='block';
        label.innerHTML=`<input type="checkbox" value="${item.name}"> ${item.name}`;
        container.appendChild(label);
      });
    }
    document.getElementById('coord-form').addEventListener('submit', e=>{
      e.preventDefault();
      const selected = Array.from(document.querySelectorAll('#coord-items input:checked')).map(i=>i.value);
      const newCoord = {
        name: document.getElementById('coord-name').value,
        items: selected,
        date: document.getElementById('coord-date').value
      };
      coordData.push(newCoord);
      localStorage.setItem('coordData', JSON.stringify(coordData)); // 保存
      e.target.reset();
      updateCalendar();
      switchView('calendar');
    });

    // --- カレンダー ---
    function updateCalendar(){
      const grid = document.getElementById('calendar-grid');
      grid.innerHTML='';
      const firstDay = new Date(currentYear,currentMonth,1).getDay();
      const lastDate = new Date(currentYear,currentMonth+1,0).getDate();
      document.getElementById('calendar-title').textContent=`${currentYear}年 ${currentMonth+1}月`;
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
      const coords = coordData.filter(c=>c.date===dateStr);
      if(coords.length===0){ div.innerHTML='この日に作成したコーデはありません。'; return; }
      div.innerHTML=coords.map(c=>`<div class="calendar-coord-detail"><strong>${c.name}</strong>: ${c.items.join(', ')}</div>`).join('');
    }
    document.getElementById('prev-month').addEventListener('click', ()=>{
      currentMonth--; if(currentMonth<0){currentMonth=11; currentYear--;} updateCalendar();
    });
    document.getElementById('next-month').addEventListener('click', ()=>{
      currentMonth++; if(currentMonth>11){currentMonth=0; currentYear++;} updateCalendar();
    });

    // --- 初期表示 ---
    document.addEventListener('DOMContentLoaded', ()=>{
      renderClothingList(); // 服一覧
      switchView('list');   // 初期タブ
    });
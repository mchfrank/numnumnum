// ==UserScript==
// @name         CW3: Кликабельные числа 1-9 (метки)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Плавающее окошко с числами 1-9. Клик — серый, второй клик — зелёный, третий — сброс. Кнопка «Очистить» сбрасывает всё.
// @author       You
// @match        https://catwar.su/cw3/*
// @match        https://catwar.su/cw3/
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'cw3_num_marks_v1';

    let state = {};
    try {
        state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch (e) {
        state = {};
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {}
    }

    // --- Стили ---
    const style = document.createElement('style');
    style.textContent = `
        #cw3-num-marks {
            position: fixed;
            top: 60px;
            left: 20px;
            z-index: 2147483647;
            background: #19191b;
            color: #e6e6e6;
            border: 1px solid #3a3a3c;
            border-radius: 12px;
            padding: 8px 10px 10px;
            font: 13px/1.3 Arial, sans-serif;
            box-shadow: 0 6px 20px rgba(0,0,0,.5);
            user-select: none;
            min-width: 190px;
        }
        #cw3-num-marks .cw3-nm-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: move;
            margin-bottom: 6px;
            font-weight: 600;
            font-size: 13px;
            color: #fff;
        }
        #cw3-num-marks .cw3-nm-collapse {
            cursor: pointer;
            padding: 0 4px;
            opacity: .7;
            font-size: 16px;
            line-height: 1;
        }
        #cw3-num-marks .cw3-nm-collapse:hover { opacity: 1; }
        #cw3-num-marks .cw3-nm-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 5px;
        }
        #cw3-num-marks .cw3-nm-btn {
            width: 100%;
            height: 38px;
            border-radius: 8px;
            border: 1px solid #3a3a3c;
            background: #2a2a2c;
            color: #e6e6e6;
            font: 600 15px Arial, sans-serif;
            cursor: pointer;
            transition: background .12s, border-color .12s, transform .05s;
        }
        #cw3-num-marks .cw3-nm-btn:hover { filter: brightness(1.15); }
        #cw3-num-marks .cw3-nm-btn:active { transform: scale(.96); }
        #cw3-num-marks .cw3-nm-btn.state-green {
            background: #2f8f4e;
            border-color: #3fbf6a;
            color: #fff;
        }
        #cw3-num-marks .cw3-nm-btn.state-gray {
            background: #7a7a7a;
            border-color: #9a9a9a;
            color: #fff;
        }
        #cw3-num-marks .cw3-nm-clear {
            margin-top: 6px;
            width: 100%;
            height: 30px;
            border-radius: 8px;
            border: 1px solid #5a3a3a;
            background: #4a2a2a;
            color: #ffd7d7;
            font: 600 12px Arial, sans-serif;
            cursor: pointer;
        }
        #cw3-num-marks .cw3-nm-clear:hover { filter: brightness(1.2); }
        #cw3-num-marks.collapsed .cw3-nm-grid,
        #cw3-num-marks.collapsed .cw3-nm-clear { display: none; }
        #cw3-num-marks.collapsed { min-width: 0; padding: 6px 10px; }
    `;
    document.head.appendChild(style);

    // --- Разметка ---
    const panel = document.createElement('div');
    panel.id = 'cw3-num-marks';
    panel.innerHTML = `
        <div class="cw3-nm-header">
            <span>Числа</span>
            <span class="cw3-nm-collapse" title="Свернуть">−</span>
        </div>
        <div class="cw3-nm-grid"></div>
        <button type="button" class="cw3-nm-clear">Очистить</button>
    `;
    document.body.appendChild(panel);

    const grid = panel.querySelector('.cw3-nm-grid');
    const buttons = {};

    for (let n = 1; n <= 9; n++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cw3-nm-btn';
        b.textContent = String(n);
        b.dataset.num = String(n);
        grid.appendChild(b);
        buttons[n] = b;
    }

    function render() {
        for (let n = 1; n <= 9; n++) {
            const b = buttons[n];
            b.classList.remove('state-green', 'state-gray');
            const s = state[String(n)];
            if (s === 'green') b.classList.add('state-green');
            else if (s === 'gray') b.classList.add('state-gray');
        }
    }

    // 1 клик — серый, 2 клик — зелёный, 3 клик — сброс
    function cycle(num) {
        const key = String(num);
        const cur = state[key];
        if (!cur) state[key] = 'gray';
        else if (cur === 'gray') state[key] = 'green';
        else delete state[key];
        save();
        render();
    }

    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.cw3-nm-btn');
        if (!btn) return;
        cycle(btn.dataset.num);
    });

    panel.querySelector('.cw3-nm-clear').addEventListener('click', () => {
        state = {};
        save();
        render();
    });

    // Сворачивание
    panel.querySelector('.cw3-nm-collapse').addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('collapsed');
        const c = panel.querySelector('.cw3-nm-collapse');
        c.textContent = panel.classList.contains('collapsed') ? '+' : '−';
    });

    // --- Перетаскивание ---
    const header = panel.querySelector('.cw3-nm-header');
    let dragging = false, dx = 0, dy = 0;

    header.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('cw3-nm-collapse')) return;
        dragging = true;
        const r = panel.getBoundingClientRect();
        dx = e.clientX - r.left;
        dy = e.clientY - r.top;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        let x = e.clientX - dx;
        let y = e.clientY - dy;
        x = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, x));
        y = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, y));
        panel.style.left = x + 'px';
        panel.style.top = y + 'px';
        panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => { dragging = false; });

    render();
})();
/**
 * 成都职业培训网络学院 - 自动刷课脚本 v4（专业版）
 * 1倍速播放 | 弹窗500ms检测 | 10秒心跳保活 | 完整鼠标事件点击
 */
(function () {
  'use strict';
  var running = false, currentLessonName = '', lastPlayedName = '';
  var checkTimer = null, popupTimer = null, heartbeatTimer = null;
  var logBox = null, statusDot = null, currentDot = null;
  var justEnded = false, endedAt = 0, lastPopupText = '';

  function log(msg) {
    var t = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    console.log('%c[v4]', 'color:#e91e63', msg);
    if (logBox) {
      var d = document.createElement('div');
      d.textContent = '[' + t + '] ' + msg;
      d.style.cssText = 'font-size:11px;line-height:1.6;color:#333;word-break:break-all;border-bottom:1px solid #f0f0f0;padding:1px 0;';
      logBox.appendChild(d);
      while (logBox.children.length > 80) logBox.removeChild(logBox.firstChild);
      logBox.scrollTop = logBox.scrollHeight;
    }
  }
  function getVideo() { return document.querySelector('video.vjs-tech') || document.querySelector('video'); }
  function getAllLessons() { return Array.prototype.slice.call(document.querySelectorAll('.ci')); }
  function getLessonStatus(ci) {
    var s = ci.querySelectorAll('span');
    for (var i = s.length - 1; i >= 0; i--) {
      var t = s[i].textContent.trim();
      if (t === '已完成' || t === '未完成' || t === '未尝试') return t;
    }
    return '';
  }
  function getLessonName(ci) {
    var s = ci.querySelectorAll('span');
    for (var i = 0; i < s.length; i++) {
      if (/^第\d+节/.test(s[i].textContent.trim())) return s[i].textContent.trim();
    }
    return ci.textContent.trim().substring(0, 40);
  }
  function realClick(el) {
    if (!el) return false;
    try {
      el.scrollIntoView({ block: 'center' });
      var r = el.getBoundingClientRect();
      var x = r.x + r.width / 2, y = r.y + r.height / 2;
      ['mouseover','mouseenter','mousedown','mouseup','click'].forEach(function(type) {
        el.dispatchEvent(new MouseEvent(type, { bubbles:true, cancelable:true, view:window, clientX:x, clientY:y, button:0 }));
      });
      el.click();
      return true;
    } catch(e) { try { el.click(); return true; } catch(e2) { return false; } }
  }
  function handlePopup() {
    try {
      var boxes = document.querySelectorAll('.el-message-box');
      for (var b = 0; b < boxes.length; b++) {
        var box = boxes[b];
        if (box.getBoundingClientRect().width === 0) continue;
        var text = box.textContent;
        if (text === lastPopupText) continue;
        lastPopupText = text;
        var btns = box.querySelectorAll('button, .el-button, [role=button]');
        if (text.indexOf('继续上次') >= 0 || text.indexOf('是否继续') >= 0) {
          for (var i = 0; i < btns.length; i++) {
            var bt = btns[i].textContent.trim();
            if (bt.indexOf('取消') === 0) {
              realClick(btns[i]);
              log('弹窗[继续播放]：点"取消"（按钮：' + bt + '）');
              return true;
            }
          }
        }
        for (var j = 0; j < btns.length; j++) {
          var jt = btns[j].textContent.trim();
          if (jt === '我知道了' || jt === '确定' || jt === '知道了' || jt === '关闭') {
            realClick(btns[j]);
            log('弹窗[提示]：点"' + jt + '"');
            return true;
          }
        }
      }
    } catch(e) {}
    return false;
  }
  function expandSection(ci) {
    try {
      var p = ci.parentElement;
      if (p && p.style.display === 'none') {
        var prev = p.previousElementSibling;
        if (prev && prev.classList.contains('ti')) { realClick(prev); log('展开章节'); }
      }
    } catch(e) {}
  }
  function findNextLesson() {
    var ls = getAllLessons();
    for (var i = 0; i < ls.length; i++) {
      if (getLessonStatus(ls[i]) !== '已完成') {
        var n = getLessonName(ls[i]);
        if (n === lastPlayedName) continue;
        return ls[i];
      }
    }
    return null;
  }
  function playLesson(ci) {
    if (!ci) return;
    expandSection(ci);
    setTimeout(function() {
      try {
        ci.scrollIntoView({ block: 'center' });
        currentLessonName = getLessonName(ci);
        lastPlayedName = currentLessonName;
        justEnded = false;
        log('开始播放：' + currentLessonName);
        realClick(ci);
      } catch(e) {}
    }, 800);
  }
  function ensurePlaying() {
    var v = getVideo();
    if (!v) return;
    if (v.playbackRate !== 1) { try { v.playbackRate = 1; } catch(e) {} }
    if (v.paused && !v.ended) {
      v.play().then(function() { log('播放中'); }).catch(function() {
        try {
          var bp = document.querySelector('.vjs-big-play-button');
          if (bp && bp.getBoundingClientRect().width > 0) realClick(bp);
        } catch(e) {}
        try { var pc = document.querySelector('.vjs-play-control'); if (pc) realClick(pc); } catch(e) {}
      });
    }
  }
  function tick() {
    if (!running) return;
    try {
      handlePopup();
      var v = getVideo();
      if (!v) { checkTimer = setTimeout(tick, 2000); return; }
      if (v.ended || v.currentTime >= v.duration - 0.5) {
        if (!justEnded) { justEnded = true; endedAt = Date.now(); log('本节播完：' + currentLessonName); }
        if (Date.now() - endedAt > 5000) {
          var next = findNextLesson();
          if (next) { log('切换下一节'); playLesson(next); endedAt = Date.now() + 30000; }
          else { log('全部完成！'); running = false; return; }
        }
        checkTimer = setTimeout(tick, 1000);
        return;
      }
      justEnded = false;
      ensurePlaying();
      if (statusDot && v.duration > 0) statusDot.textContent = '播放中 ' + Math.round(v.currentTime/v.duration*100) + '%';
    } catch(e) { log('tick err: ' + e.message); }
    checkTimer = setTimeout(tick, 1000);
  }
  function heartbeat() {
    if (!running) return;
    try {
      if (!checkTimer) { log('主循环断了重启'); tick(); }
      handlePopup();
      var v = getVideo();
      if (v) {
        if (v.playbackRate !== 1) { v.playbackRate = 1; log('心跳：修正倍速'); }
        if (v.paused && !v.ended) { log('心跳：暂停自动播'); ensurePlaying(); }
        if (v.ended && justEnded && Date.now() - endedAt > 10000) {
          log('心跳：强制切换');
          var next = findNextLesson();
          if (next) playLesson(next);
        }
      }
    } catch(e) {}
  }
  function popupCheck() {
    if (!running) return;
    handlePopup();
    popupTimer = setTimeout(popupCheck, 500);
  }
  function createUI() {
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;top:10px;right:10px;z-index:2147483647;background:rgba(255,255,255,0.98);border:2px solid #e91e63;border-radius:10px;padding:12px;width:340px;font-family:sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.3);font-size:13px;';
    box.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
      '<b style="color:#e91e63;font-size:14px;">自动刷课 v4</b>' +
      '<span id="as-status" style="font-size:12px;color:#999;">已停止</span></div>' +
      '<div id="as-current" style="font-size:12px;color:#333;margin-bottom:4px;">当前：--</div>' +
      '<div id="as-progress" style="font-size:11px;color:#888;margin-bottom:6px;">等待启动...</div>' +
      '<div id="as-log" style="max-height:200px;overflow-y:auto;background:#f8f8f8;border-radius:6px;padding:6px;font-size:11px;border:1px solid #e8e8e0;"></div>' +
      '<div style="margin-top:8px;display:flex;gap:8px;">' +
      '<button id="as-start" style="flex:1;padding:8px;border:none;border-radius:6px;background:#e91e63;color:#fff;cursor:pointer;font-size:13px;font-weight:bold;">开始自动刷课</button>' +
      '<button id="as-stop" style="flex:1;padding:8px;border:none;border-radius:6px;background:#999;color:#fff;cursor:pointer;font-size:13px;">停止</button></div>';
    document.body.appendChild(box);
    logBox = box.querySelector('#as-log');
    statusDot = box.querySelector('#as-progress');
    currentDot = box.querySelector('#as-current');
    box.querySelector('#as-start').addEventListener('click', function() {
      running = true; justEnded = false; lastPlayedName = '';
      box.querySelector('#as-status').textContent = '运行中';
      box.querySelector('#as-status').style.color = '#e91e63';
      log('=== v4启动：1x播放 | 弹窗500ms检测 | 10秒心跳 ===');
      handlePopup();
      var next = findNextLesson();
      if (next) playLesson(next);
      tick();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(heartbeat, 10000);
      if (popupTimer) clearTimeout(popupTimer);
      popupCheck();
    });
    box.querySelector('#as-stop').addEventListener('click', function() {
      running = false; clearTimeout(checkTimer); clearTimeout(popupTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      box.querySelector('#as-status').textContent = '已停止';
      box.querySelector('#as-status').style.color = '#999';
      log('已停止');
    });
    setInterval(function() {
      if (currentDot && currentLessonName) currentDot.textContent = '当前：' + currentLessonName;
    }, 1000);
  }
  function init() {
    if (!document.body) { setTimeout(init, 500); return; }
    createUI();
    log('页面已加载');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

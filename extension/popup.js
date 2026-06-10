// extension/popup.js
const API_BASE = 'http://localhost:3000';

// ----------------------------- 存储操作（Promise 封装）-----------------------------
function getStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get('token', (result) => {
      resolve(result.token);
    });
  });
}

function saveToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ token }, () => {
      resolve();
    });
  });
}

function clearToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove('token', () => {
      resolve();
    });
  });
}

// ----------------------------- UI 状态提示 -----------------------------
function setStatus(message, isError = false) {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;
  statusDiv.innerText = message;
  statusDiv.style.color = isError ? '#dc2626' : '#16a34a';
  setTimeout(() => {
    if (statusDiv.innerText === message) statusDiv.innerText = '';
  }, 3000);
}

// ----------------------------- 加载已保存的 Token 到输入框 -----------------------------
async function loadTokenToInput() {
  const token = await getStoredToken();
  const tokenInput = document.getElementById('tokenInput');
  if (tokenInput && token) tokenInput.value = token;
}

// ----------------------------- 手动保存 Token -----------------------------
function handleSaveToken() {
  const tokenInput = document.getElementById('tokenInput');
  const token = tokenInput?.value.trim();
  if (!token) {
    setStatus('请输入有效的 Token', true);
    return;
  }
  console.log('准备保存 Token:', token);
  chrome.storage.local.set({ token }, () => {
    if (chrome.runtime.lastError) {
      console.error('保存失败:', chrome.runtime.lastError);
      setStatus('保存失败: ' + chrome.runtime.lastError.message, true);
    } else {
      console.log('保存成功');
      // 立即验证
      chrome.storage.local.get('token', (result) => {
        console.log('读取到的 Token:', result.token);
        if (result.token === token) {
          setStatus('Token 已保存', false);
        } else {
          setStatus('保存验证失败', true);
        }
      });
    }
  });
}

// ----------------------------- 采集商品 -----------------------------
async function handleCollect() {
  const collectBtn = document.getElementById('collectBtn');
  if (!collectBtn) return;
  collectBtn.disabled = true;
  setStatus('采集中...', false);

  try {
    const token = await getStoredToken();
    if (!token) {
      setStatus('请先保存 API Token', true);
      collectBtn.disabled = false;
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('无法获取当前标签页');

    const productData = await chrome.tabs.sendMessage(tab.id, { action: 'extract' });
    console.log('发送到后端的数据:', productData);
    if (!productData || productData.error) {
      throw new Error(productData?.error || '无法提取商品信息');
    }

    const apiRes = await fetch(`${API_BASE}/api/collect/plugin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(productData)
    });

    if (!apiRes.ok) {
      const err = await apiRes.json().catch(() => ({}));
      if (apiRes.status === 401) {
        await clearToken();
        setStatus('Token 无效或已过期，请重新保存', true);
        return;
      }
      throw new Error(err.error || '采集失败');
    }

    setStatus('采集成功！', false);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    collectBtn.disabled = false;
  }
}

// ----------------------------- 初始化 -----------------------------
document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveTokenBtn');
  const collectBtn = document.getElementById('collectBtn');
  if (saveBtn) saveBtn.addEventListener('click', handleSaveToken);
  if (collectBtn) collectBtn.addEventListener('click', handleCollect);
  loadTokenToInput();
});
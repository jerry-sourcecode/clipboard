<template>
  <div class="desc">
    <p>你是否遇到过这样的场景：</p>
    <ul>
      <li>
        在电脑上复制了一段文字，想发到手机上，却只能通过微信、QQ“文件传输助手”来回倒腾？
      </li>
      <li>
        刚在办公室电脑上复制了一个链接，回到家打开笔记本想继续使用，却找不到它了？
      </li>
      <li>
        团队协作时，想要快速把一段代码或文本分享给同事，却要打开即时通讯工具发送？
      </li>
    </ul>
    <p>
      云剪贴板正是为解决这些问题而生的轻量工具。它让你的剪贴板内容自动同步到云端，在任何设备上，都能随时获取最近复制的内容。
    </p>
    <p>现在，为你的云剪切板取个名称，开始使用吧。</p>
  </div>
  <div class="main-div">
    <n-input
      v-model:value="value"
      type="text"
      @keyup.enter="go"
      placeholder="输入云剪切板的名称"
    />
    <n-input
      v-model:value="pwd"
      type="password"
      show-password-on="click"
      @keyup.enter="go"
      placeholder="输入云剪切板的密码，没有请留空"
    />
    <n-button
      type="primary"
      ghost
      class="go-btn"
      :disabled="value === ''"
      @click="go"
    >
      新建或查询
    </n-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { NInput, NButton } from "naive-ui";
import { useRouter } from "vue-router";

const value = ref("");
const pwd = ref("");
const router = useRouter();

function go() {
  const param = value.value;
  const qry: any = {};
  if (pwd.value) {
    qry.pwd = pwd.value;
  }
  router.push({
    path: `/${param}`,
    query: qry,
  });
}
</script>

<style scoped>
.go-btn {
  width: 100px;
}
.main-div {
  display: flex;
  justify-content: space-between;
  margin: 20px;
  flex-direction: column;
  gap: 20px;
  text-align: left;
}
.desc {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  text-align: left;
  flex-direction: column;
  margin: 20px;
}
</style>

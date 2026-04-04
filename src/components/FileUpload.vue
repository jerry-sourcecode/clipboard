<template>
  <n-upload
    ref="uploadRef"
    :default-upload="false"
    v-model:file-list="fileListRef"
    multiple
    @change="handleChange"
    @before-upload="handleBeforeUpload"
    show-download-button
    :custom-download="handleCustomDownload"
  >
    <n-button :disabled="disabled">选择文件</n-button>
  </n-upload>
</template>

<script setup lang="ts">
import { NButton, NUpload, type UploadFileInfo } from "naive-ui";
import pako from "pako";
import { ref } from "vue";
import {
  base64ToUint8,
  decryptBinary,
  encryptBinary,
  uint8ToBase64,
} from "../utils/crypto.ts";
import type { Attachment } from "../clipboard.ts";

const fileListRef = ref<UploadFileInfo[]>([]);

function handleChange(options: { fileList: UploadFileInfo[] }) {
  fileListRef.value = options.fileList;
  console.log(fileListRef);
}

function handleBeforeUpload(options: {
  file: UploadFileInfo;
  fileList: UploadFileInfo[];
}) {
  let tot = 0; // 单位：kb
  for (let i of options.fileList) {
    tot += (i.file?.size || 0) / 1024;
  }
  const thisSize = (options.file.file?.size || 0) / 1024;
  tot += thisSize;
  if (tot > 1024 * 50) {
    window.alert("文件总大小不能超过50MB。");
    return false; // 阻止上传
  }
  if (options.fileList.length >= 10) {
    window.alert("最多只能上传10个文件。");
    return false;
  }
  return true;
}

defineExpose({
  toUploadData,
  initFileData,
});

const loadingText = defineModel("loading-text", {
  type: String,
});

const disabled = defineModel("disabled", {
  type: Boolean,
  default: false,
});

function isTextMimeType(mimeType: string) {
  // 常见文本类 MIME
  const textTypes = [
    "text/plain",
    "text/html",
    "text/css",
    "text/javascript",
    "application/json",
    "application/xml",
    "application/javascript",
    "application/x-www-form-urlencoded",
    "text/markdown",
  ];
  return textTypes.includes(mimeType) || mimeType.startsWith("text/");
}

async function toUploadData(pass: string | null = null) {
  const array: Array<Attachment> = [];

  for (let i = 0; i < fileListRef.value.length; i++) {
    const uplFileInfo = fileListRef.value[i];
    loadingText.value = `正在压缩第${i + 1}个文件...`;
    const file = uplFileInfo.file!;
    let buf;
    if (!isTextMimeType(file.type)) {
      buf = await file.arrayBuffer();
    } else {
      const text = await file.text();
      const compressed = pako.deflate(text);
      buf = compressed.buffer;
    }
    let encrypted: string;
    loadingText.value = `正在加密第${i + 1}个文件...`;
    if (pass !== null) {
      encrypted = await encryptBinary(new Uint8Array(buf), pass);
    } else {
      encrypted = uint8ToBase64(new Uint8Array(buf));
    }

    array.push({ name: file.name, data: encrypted, MINE: file.type });
  }
  return array;
}

function getUint8ArrayDownloadURL(data: Uint8Array): string {
  // 使用类型断言解决 TS2322 错误
  const blob = new Blob([data as BlobPart], {
    type: "application/octet-stream",
  });

  return URL.createObjectURL(blob);
}

async function initFileData(files: Attachment[], pass: string | null = null) {
  fileListRef.value = [];

  for (let i = 0; i < files.length; i++) {
    const fl = files[i];
    const id =
      fileListRef.value.push({
        id: String(i),
        name: fl.name,
        type: fl.MINE,
        status: "uploading",
        percentage: 0,
      }) - 1;
    let res;
    if (pass) {
      res = await decryptBinary(fl.data, pass);
    } else {
      res = base64ToUint8(fl.data);
    }
    fileListRef.value[id].percentage = 50;
    let buf: Uint8Array;
    if (!isTextMimeType(fl.MINE)) {
      buf = res;
    } else {
      buf = pako.inflate(res);
    }
    fileListRef.value[id].file = new File([buf as BlobPart], fl.name, {
      type: fl.MINE,
    });
    fileListRef.value[id].percentage = 100;
    fileListRef.value[id].status = "finished";
  }
}

async function handleCustomDownload(file: UploadFileInfo) {
  const { file: fl, name } = file;
  const url = getUint8ArrayDownloadURL(
    new Uint8Array(await fl?.arrayBuffer()!),
  );
  if (!url) return;
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
</script>

<style scoped></style>

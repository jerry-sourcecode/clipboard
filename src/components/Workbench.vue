<template>
  <div class="desc" v-show="!isLoading">
    <h2 style="margin-bottom: 20px">
      <span v-if="isAppend">创建</span>剪切板
      <span>{{ param }}</span>
    </h2>

    <n-form ref="formRef" :model="formValue" style="width: 100%" :rules="rules">
      <div style="margin-bottom: 10px" v-if="!isAppend">
        <p>更新时间：{{ formatDate(creationTime) }}</p>
        <p style="margin-bottom: 10px">失效时间：{{ formatDate(deadTime) }}</p>
      </div>
      <n-form-item label="时效" path="ttl" v-if="isAppend">
        <n-select v-model:value="formValue.ttl" :options="options" />
      </n-form-item>
      <n-form-item label="使用密码" path="usePwd">
        <n-switch v-model:value="formValue.usePwd" />
      </n-form-item>
      <n-collapse-transition :show="formValue.usePwd">
        <n-form-item label="密码" path="pwd">
          <n-input
            type="password"
            show-password-on="click"
            placeholder="请输入密码"
            v-model:value="formValue.pwd"
          />
        </n-form-item>
      </n-collapse-transition>
      <n-form-item label="内容" path="text">
        <n-input
          v-model:value="formValue.text"
          type="textarea"
          placeholder="输入文本"
        />
      </n-form-item>
      <n-form-item label="启用文件上传" path="useFile">
        <n-switch v-model:value="formValue.file.use" />
      </n-form-item>
      <n-collapse-transition :show="formValue.file.use">
        <n-form-item label="文件" path="file">
          <div class="block-item">
            <div v-if="isADMIN">你已拥有管理员权限。</div>
            <div v-else>上传文件需要管理员密码：</div>
            <n-input
              v-if="!isADMIN"
              v-model:value="formValue.file.pass"
              show-password-on="click"
              type="password"
              placeholder="输入管理员密码"
              style="margin: 5px 0"
            />
            <FileUpload
              :disabled="formValue.file.pass === '' && !isADMIN"
              ref="fileUploadRef"
            />
          </div>
        </n-form-item>
      </n-collapse-transition>
      <n-form-item>
        <n-button type="info" @click="onFormSubmit" style="margin-right: 10px">
          提交
        </n-button>
        <n-button type="error" @click="onFormDelete" v-if="!isAppend">
          删除
        </n-button>
      </n-form-item>
    </n-form>
  </div>
  <div v-show="isLoading" style="margin: 10vh">
    <n-spin size="large" />
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { computed, nextTick, onMounted, type Ref, ref } from "vue";
import {
  NForm,
  NFormItem,
  NSelect,
  NInput,
  NButton,
  NSwitch,
  NCollapseTransition,
  NSpin,
  type FormItemRule,
  type NotificationType,
  type FormRules,
  type FormInst,
} from "naive-ui";
import { ClipboardClient, ClipboardError, Identity } from "../clipboard.ts";
import { useNotification, useModal } from "naive-ui";
import { h } from "vue";
import FileUpload from "./FileUpload.vue";

const route = useRoute();
const router = useRouter();
const param = route.params.param as string;
const clipboardClient = new ClipboardClient(
  import.meta.env.VITE_CLIPBOARD_API_PATH,
);

const creationTime = ref(new Date());
const deadTime = ref(new Date());
const thisPwd: Ref<string | null> = ref(route.query.pwd as string | null);

const isLoading = ref(true);
const isADMIN = ref(false);

const fileUploadRef = ref<InstanceType<typeof FileUpload> | null>(null);

const isAppend = ref(false);
const modal = useModal();
const formRef: Ref<FormInst | null> = ref(null);

const formValue = ref({
  ttl: 24 * 60 * 60,
  text: "",
  pwd: "",
  usePwd: false,
  file: {
    pass: "",
    use: false,
  },
});

const formPwd = computed(() => {
  return formValue.value.usePwd ? formValue.value.pwd : undefined;
});

const options = [
  {
    label: "10分钟",
    value: 10 * 60,
  },
  {
    label: "1小时",
    value: 60 * 60,
  },
  {
    label: "12小时",
    value: 12 * 60 * 60,
  },
  {
    label: "1天",
    value: 24 * 60 * 60,
  },
  {
    label: "3天",
    value: 3 * 24 * 60 * 60,
  },
  {
    label: "7天",
    value: 7 * 24 * 60 * 60,
  },
  {
    label: "30天",
    value: 30 * 24 * 60 * 60,
  },
  {
    label: "60天",
    value: 60 * 24 * 60 * 60,
  },
];

onMounted(() => {
  clipboardClient.get(param, thisPwd.value).then(
    (res) => {
      isAppend.value = false;
      formValue.value.text = res.content;
      creationTime.value = new Date(res.creationTime);
      deadTime.value = new Date(res.deadTime);
      formValue.value.usePwd = res.pwd !== null;
      formValue.value.pwd = res.pwd ?? "";
      isADMIN.value = res.identity === Identity.Admin;
      formValue.value.file.use = res.files.length !== 0;
      notify("info", "查询成功", `查询到剪切板已经存在内容。`);
      isLoading.value = false;
      nextTick(() => {
        fileUploadRef.value!.initFileData(res.files, formPwd.value ?? null);
      });
    },
    (rej: ClipboardError) => {
      if (rej.status === 403) {
        router.push("/");
        notify(
          "error",
          "查询失败",
          `${thisPwd.value ? `密码错误` : `需要密码`}。`,
        );
      } else {
        isAppend.value = true;
        isLoading.value = false;
      }
    },
  );
});

const notification = useNotification();

function notify(type: NotificationType, title: string, content: string) {
  notification[type]({
    title,
    content,
    duration: 3000,
    keepAliveOnHover: true,
  });
}

const rules: FormRules = {
  text: [
    {
      validator(_: FormItemRule, value: string) {
        if (!value) {
          return new Error("内容不能为空。");
        }
      },
      trigger: ["blur"],
    },
  ],
  pwd: [
    {
      validator(_: FormItemRule, value: string) {
        if (!value && formValue.value.usePwd) {
          return new Error("密码不能为空。");
        }
      },
      trigger: ["blur"],
    },
  ],
};

function onFormSubmit() {
  formRef.value?.validate((errors) => {
    if (!errors) submit();
    else return;
  });
}

async function submit() {
  async function getAttachment() {
    return formValue.value.file.use
      ? {
          files: await fileUploadRef.value!.toUploadData(formPwd.value),
          admin_key: formValue.value.file.pass,
        }
      : undefined;
  }
  isLoading.value = true;
  if (isAppend.value) {
    clipboardClient
      .create(formValue.value.text, {
        id: param,
        expirationTtl: formValue.value.ttl,
        pwd: formPwd.value,
        file: await getAttachment(),
      })
      .then(
        () => {
          isAppend.value = false;
          notify("success", "创建成功！", `成功创建剪切板，名称为 ${param}。`);
        },
        (rej) => {
          notify("error", "创建失败", `创建时发生错误，错误信息：${rej}`);
        },
      )
      .finally(() => {
        isLoading.value = false;
      });
  } else {
    clipboardClient
      .update(param, formValue.value.text, {
        old_pwd: thisPwd.value,
        new_pwd: formPwd.value,
        file: await getAttachment(),
      })
      .then(
        () => {
          notify("success", "更新成功！", `成功更新剪切板，名称为 ${param}。`);
        },
        (rej) => {
          notify("error", "更新失败", `更新时发生错误，错误信息：${rej}`);
        },
      )
      .finally(() => {
        isLoading.value = false;
      });
  }
}

function onFormDelete() {
  const m = modal.create({
    title: "删除提醒",
    preset: "card",
    content: "你确定要删除吗？此操作无法撤销。",
    style: {
      width: "400px",
    },
    footer: () => [
      h(
        NButton,
        {
          type: "default",
          style: "margin-right: 10px",
          onClick: () => m.destroy(),
        },
        () => "取消",
      ),
      h(
        NButton,
        {
          type: "error",
          onClick: () => {
            m.destroy();
            isLoading.value = true;
            clipboardClient
              .delete(param, thisPwd.value)
              .then(
                () => {
                  notify("success", "删除成功！", `成功删除剪切板 ${param}。`);
                  router.push("/");
                },
                (rej) => {
                  notify(
                    "error",
                    "删除失败",
                    `删除时发生错误，错误信息：${rej}`,
                  );
                },
              )
              .finally(() => {
                isLoading.value = false;
              });
          },
        },
        () => "确定",
      ),
    ],
  });
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
}
</script>

<style scoped>
h2 {
  font-weight: bold;
}
.desc {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  flex-direction: column;
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
}
.block-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
}
</style>

<template>
  <slot :config="config" :state="captchaState" :actions="captchaState.actions">
    <slot name="default"></slot>
  </slot>
</template>

<script setup lang="ts">
import { provide, toRef } from 'vue';
import type { CaptchaConfig } from '../types';
import { CaptchaConfigKey } from '../types';
import { useCaptchaState } from '../composables/useCaptchaState';

const props = defineProps<{
  config: CaptchaConfig;
}>();

provide(CaptchaConfigKey, props.config);

const captchaState = useCaptchaState();
</script>

<style scoped>
</style>

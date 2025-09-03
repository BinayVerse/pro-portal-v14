<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
          <UIcon name="mdi:whatsapp" class="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-white">WhatsApp Business Integration</h1>
          <p class="text-gray-400">Connect your WhatsApp Business account to provento</p>
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <!-- Status Badge -->
        <span
          v-if="connectionStatus.isConnected"
          class="bg-green-500/20 text-green-400 px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
        >
          <UIcon name="heroicons:check-circle" class="w-4 h-4" />
          <span>Connected</span>
        </span>
        <span
          v-else-if="connectionStatus.hasBeenConnected"
          class="bg-yellow-500/20 text-yellow-400 px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
        >
          <UIcon name="heroicons:exclamation-circle" class="w-4 h-4" />
          <span>Disconnected</span>
        </span>
        <span
          v-else
          class="bg-gray-500/20 text-gray-400 px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
        >
          <UIcon name="heroicons:minus-circle" class="w-4 h-4" />
          <span>Not configured</span>
        </span>

        <!-- Action Button -->
        <UButton
          v-if="connectionStatus.isConnected"
          @click="showDisconnectModal = true"
          :loading="integrationsStore.loading"
          color="red"
          icon="heroicons:link-slash"
        >
          Disconnect
        </UButton>

        <UButton
          v-else-if="connectionStatus.hasBeenConnected"
          @click="reconnectWhatsApp"
          color="green"
          icon="heroicons:arrow-path"
        >
          Reconnect
        </UButton>

        <UButton v-else @click="connectWhatsApp" color="green" icon="heroicons:plus">
          Connect
        </UButton>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- WhatsApp Configuration -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <UIcon name="heroicons:cog-6-tooth" class="w-5 h-5 text-gray-400" />
              <h2 class="text-lg font-semibold text-white">WhatsApp Configuration</h2>
            </div>

            <!-- Edit/Save/Cancel buttons -->
            <div class="flex items-center space-x-2">
              <UButton
                v-if="!isEditMode"
                @click="enterEditMode"
                size="sm"
                color="gray"
                variant="ghost"
                icon="heroicons:pencil"
              >
                Edit
              </UButton>

              <template v-else>
                <UButton
                  @click="saveConfiguration"
                  :loading="isSaving"
                  size="sm"
                  color="green"
                  icon="heroicons:check"
                >
                  Save
                </UButton>
                <UButton
                  @click="cancelEdit"
                  :disabled="isSaving"
                  size="sm"
                  color="gray"
                  variant="ghost"
                  icon="heroicons:x-mark"
                >
                  Cancel
                </UButton>
              </template>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Loading State -->
          <div v-if="integrationsStore.loading" class="space-y-4">
            <div class="animate-pulse">
              <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-2"></div>
              <div class="h-10 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
            <div class="animate-pulse">
              <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-2"></div>
              <div class="h-10 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
            <div class="animate-pulse">
              <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-2"></div>
              <div class="h-10 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
          </div>

          <!-- Content -->
          <div v-else class="space-y-4">
            <!-- Business WhatsApp Number -->
            <UFormGroup label="Business WhatsApp Number">
              <UInput
                v-if="!isEditMode"
                :model-value="whatsappConfig.businessNumber || 'Not configured'"
                readonly
                icon="heroicons:phone"
                placeholder="No business number configured"
              />
              <LibVueTelInput
                v-else
                ref="phoneRef"
                :prop-phone="editForm.businessNumber"
                placeholder="Enter business WhatsApp number"
                default-country="US"
                class="whatsapp-tel-input"
              />
            </UFormGroup>

            <!-- App ID -->
            <UFormGroup label="App ID">
              <UInput
                v-if="!isEditMode"
                :model-value="whatsappConfig.appId || 'Not configured'"
                readonly
                icon="heroicons:identification"
                placeholder="No App ID configured"
              />
              <UInput
                v-else
                v-model="editForm.appId"
                icon="heroicons:identification"
                placeholder="Enter your WhatsApp App ID"
              />
            </UFormGroup>

            <!-- Webhook URL -->
            <UFormGroup label="Webhook URL">
              <UInput
                v-if="!isEditMode"
                :model-value="whatsappConfig.webhookUrl || 'Not configured'"
                readonly
                icon="heroicons:link"
                placeholder="No webhook URL configured"
              />
              <UInput
                v-else
                v-model="editForm.webhookUrl"
                icon="heroicons:link"
                placeholder="https://your-domain.com/api/whatsapp/webhook"
              />
            </UFormGroup>

            <!-- Permanent Access Token -->
            <UFormGroup label="Permanent Access Token">
              <UInput
                v-if="!isEditMode"
                :model-value="whatsappConfig.accessToken || 'Not configured'"
                readonly
                icon="heroicons:key"
                placeholder="No access token configured"
              />
              <UInput
                v-else
                v-model="editForm.accessToken"
                icon="heroicons:key"
                placeholder="Enter permanent access token"
              />
            </UFormGroup>

            <!-- App Secret Key (visible in both view and edit modes) -->
            <UFormGroup label="App Secret Key">
              <div class="relative">
                <UInput
                  v-if="!isEditMode"
                  :model-value="
                    whatsappConfig.appSecret
                      ? showAppSecret
                        ? whatsappConfig.appSecret
                        : '••••••••••••••••••••••••••••••••'
                      : 'Not configured'
                  "
                  readonly
                  icon="heroicons:key"
                  :type="showAppSecret ? 'text' : 'password'"
                  placeholder="No app secret configured"
                />
                <UInput
                  v-else
                  v-model="editForm.appSecret"
                  icon="heroicons:key"
                  :type="showAppSecret ? 'text' : 'password'"
                  placeholder="Enter your WhatsApp app secret key"
                />
                <button
                  v-if="
                    (isEditMode && editForm.appSecret) || (!isEditMode && whatsappConfig.appSecret)
                  "
                  @click="showAppSecret = !showAppSecret"
                  type="button"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <UIcon
                    :name="showAppSecret ? 'heroicons:eye-slash' : 'heroicons:eye'"
                    class="w-4 h-4"
                  />
                </button>
              </div>
            </UFormGroup>
          </div>
        </div>
      </UCard>

      <!-- QR Code & Connection Status -->
      <UCard>
        <template #header>
          <div class="flex items-center space-x-2">
            <UIcon name="heroicons:qr-code" class="w-5 h-5 text-gray-400" />
            <h2 class="text-lg font-semibold text-white">WhatsApp QR Code</h2>
          </div>
        </template>

        <div class="space-y-4">
          <!-- QR Code -->
          <div class="flex flex-col items-center space-y-4">
            <div class="bg-white p-4 rounded-lg">
              <div class="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <!-- QR Code placeholder - you can replace this with actual QR code generation -->
                <div class="text-center">
                  <UIcon name="heroicons:qr-code" class="w-16 h-16 text-gray-400 mx-auto mb-2" />
                  <p class="text-sm text-gray-500">Scan to connect</p>
                </div>
              </div>
            </div>
            <p class="text-center text-gray-300 text-sm">
              Scan this QR code with WhatsApp to connect with our bot
            </p>
          </div>

          <!-- Connection Status Details -->
          <div class="space-y-3 mt-6">
            <!-- Status -->
            <div
              class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700"
            >
              <span class="text-gray-600 dark:text-gray-300">Status:</span>
              <span
                v-if="connectionStatus.isConnected"
                class="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm font-medium flex items-center space-x-1"
              >
                <UIcon name="heroicons:check-circle" class="w-3 h-3" />
                <span>Connected</span>
              </span>
              <span
                v-else-if="connectionStatus.hasBeenConnected"
                class="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-sm font-medium flex items-center space-x-1"
              >
                <UIcon name="heroicons:exclamation-circle" class="w-3 h-3" />
                <span>Disconnected</span>
              </span>
              <span
                v-else
                class="bg-gray-500/20 text-gray-400 px-2 py-1 rounded text-sm font-medium flex items-center space-x-1"
              >
                <UIcon name="heroicons:minus-circle" class="w-3 h-3" />
                <span>Not configured</span>
              </span>
            </div>

            <!-- Integration Status -->
            <div class="flex items-center justify-between py-3">
              <span class="text-gray-600 dark:text-gray-300">Integration:</span>
              <span class="text-gray-900 dark:text-white font-medium">
                {{
                  connectionStatus.isConnected
                    ? 'Active'
                    : connectionStatus.hasBeenConnected
                      ? 'Inactive'
                      : 'Not setup'
                }}
              </span>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Additional Information Card -->
    <UCard v-if="connectionStatus.isConnected">
      <template #header>
        <div class="flex items-center space-x-2">
          <UIcon name="heroicons:information-circle" class="w-5 h-5 text-green-400" />
          <h3 class="text-lg font-semibold text-white">Integration Details</h3>
        </div>
      </template>

      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div class="flex items-center space-x-2 mb-2">
              <UIcon name="heroicons:chat-bubble-left-ellipsis" class="w-4 h-4 text-green-400" />
              <span class="text-sm font-medium text-gray-600 dark:text-gray-300"
                >Bot Capabilities</span
              >
            </div>
            <ul class="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <li>• Send and receive messages</li>
              <li>• Process media files</li>
              <li>• Handle business inquiries</li>
              <li>• Automated responses</li>
            </ul>
          </div>

          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div class="flex items-center space-x-2 mb-2">
              <UIcon name="heroicons:shield-check" class="w-4 h-4 text-green-400" />
              <span class="text-sm font-medium text-gray-600 dark:text-gray-300">Security</span>
            </div>
            <ul class="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <li>• End-to-end encryption</li>
              <li>• Secure webhook endpoints</li>
              <li>• Token-based authentication</li>
              <li>• GDPR compliant</li>
            </ul>
          </div>
        </div>

        <div
          class="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
        >
          <UIcon name="heroicons:lightbulb" class="w-5 h-5 text-green-500" />
          <div class="text-sm text-green-700 dark:text-green-300">
            <strong>Tip:</strong> You can test the integration by sending a message to your WhatsApp
            Business number.
          </div>
        </div>
      </div>
    </UCard>

    <!-- Disconnect Confirmation Modal -->
    <UModal v-model="showDisconnectModal">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-center space-x-3">
            <UIcon name="heroicons:exclamation-triangle" class="w-6 h-6 text-red-500" />
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Disconnect WhatsApp Integration
            </h3>
          </div>
        </template>

        <div class="space-y-3">
          <p class="text-gray-600 dark:text-gray-300">
            Are you sure you want to disconnect your WhatsApp Business integration? This action
            will:
          </p>
          <ul class="text-sm text-gray-500 dark:text-gray-400 space-y-1 ml-4">
            <li>• Stop all message processing</li>
            <li>• Disable bot responses</li>
            <li>• Require re-authentication to reconnect</li>
            <li>• Remove webhook configuration</li>
          </ul>
          <p class="text-sm text-red-600 dark:text-red-400 font-medium">
            This action cannot be undone.
          </p>
        </div>

        <template #footer>
          <div class="flex justify-end space-x-3">
            <UButton
              @click="showDisconnectModal = false"
              :disabled="integrationsStore.loading"
              color="gray"
              variant="ghost"
            >
              Cancel
            </UButton>
            <UButton
              @click="disconnectWhatsApp"
              :loading="integrationsStore.loading"
              color="red"
              icon="heroicons:link-slash"
            >
              Disconnect
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
// Using admin layout
definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

import { useIntegrationsStore } from '~/stores'

const integrationsStore = useIntegrationsStore()
const { showSuccess, showError } = useNotification()

// Reactive data
const showDisconnectModal = ref(false)
const isEditMode = ref(false)
const isSaving = ref(false)
const showAppSecret = ref(false)
const phoneRef = ref()

// Edit form data
const editForm = ref({
  businessNumber: '',
  appId: '',
  webhookUrl: '',
  accessToken: '',
  appSecret: '',
})

// Computed properties for WhatsApp configuration
const whatsappConfig = computed(() => {
  // This would normally come from your integrations store
  // For now, returning empty values with placeholders
  return {
    businessNumber: '',
    appId: '',
    webhookUrl: '',
    accessToken: '',
    appSecret: '',
  }
})

// Computed properties for connection status
const connectionStatus = computed(() => {
  // This would normally come from your integrations store
  // Check if we have all required configuration
  const hasConfig =
    whatsappConfig.value.businessNumber &&
    whatsappConfig.value.appId &&
    whatsappConfig.value.webhookUrl &&
    whatsappConfig.value.accessToken

  const isConnected = false // You can modify this based on actual connection status
  const hasBeenConnected = false // This would be true if previously connected but now disconnected

  return {
    isConnected: Boolean(isConnected && hasConfig),
    hasBeenConnected: Boolean(hasBeenConnected),
    neverConnected: !hasConfig,
  }
})

// Methods
const connectWhatsApp = async () => {
  // Implement WhatsApp connection logic
  console.log('Connecting WhatsApp integration...')
}

const reconnectWhatsApp = async () => {
  // Implement WhatsApp reconnection logic
  console.log('Reconnecting WhatsApp integration...')
}

const disconnectWhatsApp = async () => {
  // Implement WhatsApp disconnection logic
  console.log('Disconnecting WhatsApp integration...')
  showDisconnectModal.value = false
}

// Edit mode methods
const enterEditMode = () => {
  // Populate edit form with current values
  editForm.value = {
    businessNumber: whatsappConfig.value.businessNumber || '',
    appId: whatsappConfig.value.appId || '',
    webhookUrl: whatsappConfig.value.webhookUrl || '',
    accessToken: whatsappConfig.value.accessToken || '',
    appSecret: whatsappConfig.value.appSecret || '',
  }
  isEditMode.value = true
}

const cancelEdit = () => {
  // Reset form and exit edit mode
  editForm.value = {
    businessNumber: '',
    appId: '',
    webhookUrl: '',
    accessToken: '',
    appSecret: '',
  }

  // Reset phone component
  phoneRef.value?.resetPhoneField()

  showAppSecret.value = false
  isEditMode.value = false
}

const saveConfiguration = async () => {
  try {
    isSaving.value = true

    // Validate phone number using the phone component
    const phoneValidation = phoneRef.value?.handlePhoneValidation()
    if (!phoneValidation?.status) {
      showError(phoneValidation?.message || 'Please enter a valid phone number.')
      return
    }

    // Get the formatted phone number from the phone component
    const phoneData = phoneRef.value?.phoneData
    const formattedPhone = phoneData?.number || phoneData?.formatted

    // Validate other required fields
    if (
      !formattedPhone ||
      !editForm.value.appId ||
      !editForm.value.webhookUrl ||
      !editForm.value.accessToken
    ) {
      showError(
        'Please fill in all required fields: Business Number, App ID, Webhook URL, and Access Token.',
      )
      return
    }

    // Update the business number with the formatted phone number
    editForm.value.businessNumber = formattedPhone

    // Here you would normally make an API call to save the configuration
    // await integrationsStore.updateWhatsAppConfig(editForm.value)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    showSuccess('WhatsApp configuration updated successfully!')

    // Exit edit mode and reset password visibility
    showAppSecret.value = false
    isEditMode.value = false
  } catch (error) {
    showError('Failed to update WhatsApp configuration. Please try again.')
    console.error('Error saving WhatsApp config:', error)
  } finally {
    isSaving.value = false
  }
}

// Lifecycle
onMounted(async () => {
  // Fetch current WhatsApp details if you have an integrations store method
  // await integrationsStore.fetchWhatsAppDetails()
})

useHead({
  title: 'WhatsApp Business Integration - Admin Dashboard',
})
</script>

<style scoped>
/* Style LibVueTelInput to look exactly like UInput fields */
:deep(.whatsapp-tel-input .vue-tel-input) {
  border: 1px solid rgb(75 85 99) !important;
  border-radius: 0.5rem !important;
  background-color: rgb(17, 24, 39) !important;
  height: 2.5rem !important;
  min-height: 2.5rem !important;
  max-height: 2.5rem !important;
  display: flex !important;
  align-items: center !important;
  transition:
    border-color 0.15s ease-in-out,
    box-shadow 0.15s ease-in-out !important;
}

:deep(.whatsapp-tel-input .vue-tel-input:focus-within) {
  border-color: rgb(59 130 246) !important;
  box-shadow: 0 0 0 1px rgb(59 130 246) !important;
  outline: none !important;
}

/* Hide the default dropdown and make it look like an icon */
:deep(.whatsapp-tel-input .vti__dropdown) {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  margin: 0 !important;
  cursor: pointer !important;
}

:deep(.whatsapp-tel-input .vti__dropdown:hover) {
  background: transparent !important;
}

:deep(.whatsapp-tel-input .vti__dropdown.open) {
  background: transparent !important;
}

/* Style the flag to look like an icon */
:deep(.whatsapp-tel-input .vti__selection) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
  background: transparent !important;
  border: none !important;
}

/* Style the input to match UInput */
:deep(.whatsapp-tel-input .vue-tel-input input) {
  background: transparent !important;
  border: none !important;
  outline: none !important;
  color: rgb(243 244 246) !important;
  font-size: 0.875rem !important;
  line-height: 1.25rem !important;
  padding: 0.5rem 0.75rem !important;
  height: 100% !important;
  flex: 1 !important;
  margin-left: 0.5rem !important;
}

:deep(.whatsapp-tel-input .vue-tel-input input::placeholder) {
  color: rgb(156 163 175) !important;
}

:deep(.whatsapp-tel-input .vue-tel-input input:focus) {
  outline: none !important;
  box-shadow: none !important;
}

/* Style the dropdown list */
:deep(.whatsapp-tel-input .vti__dropdown-list) {
  background-color: rgb(17, 24, 39) !important;
  border: 1px solid rgb(75 85 99) !important;
  border-radius: 0.5rem !important;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3) !important;
  max-height: 200px !important;
  overflow-y: auto !important;
  z-index: 50 !important;
  margin-top: 0.25rem !important;
}

:deep(.whatsapp-tel-input .vti__dropdown-item) {
  padding: 0.5rem 0.75rem !important;
  color: rgb(243 244 246) !important;
  font-size: 0.875rem !important;
  border-bottom: 1px solid rgb(55 65 81) !important;
  display: flex !important;
  align-items: center !important;
}

:deep(.whatsapp-tel-input .vti__dropdown-item:hover) {
  background-color: rgb(55 65 81) !important;
}

:deep(.whatsapp-tel-input .vti__dropdown-item.highlighted) {
  background-color: rgb(59 130 246) !important;
  color: white !important;
}

:deep(.whatsapp-tel-input .vti__dropdown-item:last-child) {
  border-bottom: none !important;
}

/* Style the search box */
:deep(.whatsapp-tel-input .vti__search_box) {
  background-color: rgb(31 41 55) !important;
  color: rgb(243 244 246) !important;
  border: none !important;
  border-bottom: 1px solid rgb(75 85 99) !important;
  font-size: 0.875rem !important;
  padding: 0.5rem 0.75rem !important;
  margin: 0 !important;
}

:deep(.whatsapp-tel-input .vti__search_box::placeholder) {
  color: rgb(156 163 175) !important;
}

:deep(.whatsapp-tel-input .vti__search_box:focus) {
  outline: none !important;
  border-bottom-color: rgb(59 130 246) !important;
}

/* Ensure proper box sizing */
:deep(.whatsapp-tel-input *) {
  box-sizing: border-box !important;
}
</style>

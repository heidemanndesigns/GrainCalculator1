<script>
	let isTopSectionLocked = $state(false);
	let loadNumber = $state('');
	let date = $state('');
	let fieldNumber = $state('');
	let operator = $state('');
	let totalFieldAcres = $state(0);
	let manualShrinkFactor = $state(0);
	let wetWeight = $state(0);
	let moistureContent = $state(0);
	let targetMoisture = $state(15.5); // Standard target moisture for corn

	let dryWeight = $derived(0);
	let shrinkFactor = $derived(0);
	let moistureShrink = $derived(0);

	let calculatedWetBushels = $state(0);
	let calculatedDryWeight = $state(0);
	let calculatedDryBushels = $state(0);
	let showLoadResults = $state(false);
	let showModal = $state(false);
	let displayedLoadNumber = $state('');
	let displayedWetWeight = $state(0);
	let displayedMoistureContent = $state(0);

	// Chatbot state
	let chatbotOpen = $state(false);
	let chatbotMessages = $state([]);
	let chatbotInput = $state('');

	$effect(() => {
		if (wetWeight > 0 && moistureContent > 0 && targetMoisture >= 0) {
			// Calculate shrink factor
			shrinkFactor = (100 - moistureContent) / (100 - targetMoisture);
			
			// Calculate dry weight
			dryWeight = wetWeight * shrinkFactor;
			
			// Calculate moisture shrink (weight loss due to moisture)
			moistureShrink = wetWeight - dryWeight;
		} else {
			shrinkFactor = 0;
			dryWeight = 0;
			moistureShrink = 0;
		}
	});

	function enterTopSection() {
		isTopSectionLocked = true;
	}

	function newTopSection() {
		isTopSectionLocked = false;
		date = '';
		fieldNumber = '';
		operator = '';
		totalFieldAcres = 0;
		manualShrinkFactor = 0;
	}

	function enterLoad() {
		// Calculate values
		if (wetWeight > 0 && moistureContent > 0 && manualShrinkFactor > 0) {
			calculatedWetBushels = wetWeight / 56;
			calculatedDryWeight = wetWeight - (wetWeight * (moistureContent - 15) * manualShrinkFactor);
			calculatedDryBushels = calculatedDryWeight / 56;
			
			// Store values for display
			displayedLoadNumber = loadNumber;
			displayedWetWeight = wetWeight;
			displayedMoistureContent = moistureContent;
			
			showLoadResults = true;
			showModal = true;
		}
		
		// TODO: Save/process the load data here
		// Reset the load-specific fields after entering
		loadNumber = '';
		wetWeight = 0;
		moistureContent = 0;
	}

	function closeModal() {
		showModal = false;
	}

	// Google Sheet URL - replace with your actual Google Sheet URL
	// You can use fieldNumber in the URL if needed
	let googleSheetUrl = $derived(
		fieldNumber 
			? `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit#gid=0&range=A1&q=${encodeURIComponent(fieldNumber)}`
			: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit#gid=0'
	);

	// Chatbot functions
	function toggleChatbot() {
		chatbotOpen = !chatbotOpen;
		if (chatbotOpen && chatbotMessages.length === 0) {
			// Add welcome message
			chatbotMessages = [{
				type: 'bot',
				text: 'Hello! I can help you with questions about your grain loads. What would you like to know?'
			}];
		}
	}

	function sendChatbotMessage() {
		if (!chatbotInput.trim()) return;

		// Add user message
		chatbotMessages = [...chatbotMessages, {
			type: 'user',
			text: chatbotInput
		}];

		const userMessage = chatbotInput.toLowerCase();
		chatbotInput = '';

		// Simulate bot response (you can replace this with actual API call)
		setTimeout(() => {
			let botResponse = 'I can help you with questions about your loads. ';
			
			if (userMessage.includes('load') || userMessage.includes('field')) {
				botResponse = 'I can provide information about your loads. Currently, I can see you\'re working with Field Number: ' + (fieldNumber || 'not set') + '. Would you like to know more about a specific load?';
			} else if (userMessage.includes('weight') || userMessage.includes('bushel')) {
				botResponse = 'I can help with weight and bushel calculations. The current calculation shows Wet Bushels, Dry Weight, and Dry Bushels. What specific information do you need?';
			} else if (userMessage.includes('moisture') || userMessage.includes('shrink')) {
				botResponse = 'I can help with moisture content and shrink factor questions. The shrink factor is used to calculate dry weight from wet weight. What would you like to know?';
			} else {
				botResponse = 'I can help you with questions about your grain loads, including load numbers, weights, moisture content, and calculations. What specific information are you looking for?';
			}

			chatbotMessages = [...chatbotMessages, {
				type: 'bot',
				text: botResponse
			}];
		}, 500);
	}

	function handleChatbotKeydown(event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendChatbotMessage();
		}
	}
</script>

<svelte:head>
	<title>Dry Grain Calculator - Ag Tools</title>
	<meta name="description" content="Calculate dry grain weight and moisture shrink" />
</svelte:head>

<section class="calculator">
	<h1>Dry Grain Calculator</h1>
	<p class="description">
		Calculate the dry weight of grain after accounting for shrinkage. Enter the wet weight and current moisture content to determine the dry weight and dry bushels.
	</p>

	<div class="form-container">
		<div class="top-section" class:locked={isTopSectionLocked}>
			<div class="input-row">
				<div class="input-group">
					<label for="date">Date</label>
					<input
						id="date"
						type="date"
						bind:value={date}
						disabled={isTopSectionLocked}
					/>
				</div>

				<div class="input-group">
					<label for="operator">Operator</label>
					<input
						id="operator"
						type="text"
						bind:value={operator}
						placeholder="Enter operator name"
						disabled={isTopSectionLocked}
					/>
				</div>

				<div class="input-group">
					<label for="field-number">Field Number</label>
					<input
						id="field-number"
						type="text"
						bind:value={fieldNumber}
						placeholder="Enter field number"
						disabled={isTopSectionLocked}
					/>
				</div>
			</div>

			<div class="input-row">
				<div class="input-group">
					<label for="total-field-acres">Total Field Acres</label>
					<input
						id="total-field-acres"
						type="number"
						step="0.01"
						min="0"
						bind:value={totalFieldAcres}
						placeholder="0"
						disabled={isTopSectionLocked}
					/>
				</div>

				<div class="input-group">
					<label for="manual-shrink-factor">Shrink Factor</label>
					<select
						id="manual-shrink-factor"
						bind:value={manualShrinkFactor}
						disabled={isTopSectionLocked}
					>
						<option value={0}>Select shrink factor</option>
						<option value={0.013}>0.013</option>
						<option value={0.0135}>0.0135</option>
						<option value={0.014}>0.014</option>
						<option value={0.0145}>0.0145</option>
						<option value={0.015}>0.015</option>
					</select>
				</div>
			</div>

			<div class="top-section-buttons">
				<button class="enter-btn" onclick={enterTopSection} disabled={isTopSectionLocked}>Enter</button>
				<button class="new-btn" onclick={newTopSection}>New</button>
			</div>
		</div>

		<hr class="form-divider" />

		<div class="input-group">
			<label for="load-number">Load Number</label>
			<input
				id="load-number"
				type="text"
				bind:value={loadNumber}
				placeholder="Enter load number"
				disabled={!isTopSectionLocked}
			/>
		</div>

		<div class="input-row">
			<div class="input-group">
				<label for="wet-weight">Wet Weight</label>
				<input
					id="wet-weight"
					type="number"
					step="0.01"
					min="0"
					bind:value={wetWeight}
					placeholder="0"
					disabled={!isTopSectionLocked}
				/>
			</div>

			<div class="input-group">
				<label for="moisture">Current Moisture Content (%)</label>
				<input
					id="moisture"
					type="number"
					step="0.1"
					min="0"
					max="100"
					bind:value={moistureContent}
					placeholder="0"
					disabled={!isTopSectionLocked}
				/>
			</div>
		</div>

		<div class="button-row">
			<button class="reset-btn" onclick={enterLoad} disabled={!isTopSectionLocked}>Calculate and Enter Load</button>
			<a 
				href={googleSheetUrl} 
				target="_blank" 
				rel="noopener noreferrer"
				class="view-previous-link"
				class:disabled={!isTopSectionLocked}
			>
				View Previous Load Results
			</a>
		</div>
	</div>
</section>

{#if showModal}
	<div 
		class="modal-overlay" 
		onclick={closeModal}
		onkeydown={(e) => e.key === 'Escape' && closeModal()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
	>
		<article 
			class="modal-content" 
			onclick={(e) => e.stopPropagation()}
		>
			<button class="modal-close" onclick={closeModal}>×</button>
			<div class="load-results">
				<h2 id="modal-title">Load Calculation Results</h2>
				<div class="result-card">
					<div class="result-item">
						<span class="label">Load Number:</span>
						<span class="value">{displayedLoadNumber || 'N/A'}</span>
					</div>
					<div class="result-item">
						<span class="label">Wet Weight:</span>
						<span class="value">{displayedWetWeight.toFixed(2)}</span>
					</div>
					<div class="result-item">
						<span class="label">Current Moisture Content:</span>
						<span class="value">{displayedMoistureContent.toFixed(1)}%</span>
					</div>
					<div class="result-item">
						<span class="label">Wet Bushels:</span>
						<span class="value">{calculatedWetBushels.toFixed(2)}</span>
					</div>
					<div class="result-item">
						<span class="label">Dry Weight:</span>
						<span class="value">{calculatedDryWeight.toFixed(2)}</span>
					</div>
					<div class="result-item">
						<span class="label">Dry Bushels:</span>
						<span class="value">{calculatedDryBushels.toFixed(2)}</span>
					</div>
				</div>
			</div>
		</article>
	</div>
{/if}

<!-- Chatbot -->
<div class="chatbot-container">
	{#if chatbotOpen}
		<div class="chatbot-window">
			<div class="chatbot-header">
				<h3>Harvest IQ</h3>
				<button class="chatbot-close" onclick={toggleChatbot}>×</button>
			</div>
			<div class="chatbot-messages">
				{#each chatbotMessages as message}
					<div class="chatbot-message" class:user-message={message.type === 'user'}>
						<div class="message-content">
							{message.text}
						</div>
					</div>
				{/each}
			</div>
			<div class="chatbot-input-container">
				<input
					type="text"
					class="chatbot-input"
					placeholder="Ask a question about your loads..."
					bind:value={chatbotInput}
					onkeydown={handleChatbotKeydown}
				/>
				<button class="chatbot-send" onclick={sendChatbotMessage}>Send</button>
			</div>
		</div>
	{:else}
		<button class="chatbot-toggle" onclick={toggleChatbot} aria-label="Open chatbot">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
			</svg>
		</button>
	{/if}
</div>

<style>
	.calculator {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		text-align: center;
		margin-bottom: 0.5rem;
		color: var(--color-theme-2);
	}

	.description {
		text-align: center;
		margin-bottom: 2rem;
		color: var(--color-text);
		opacity: 0.8;
	}

	.form-container {
		background: rgba(255, 255, 255, 0.7);
		border-radius: 8px;
		padding: 2rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;
	}

	.input-row {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.input-row .input-group {
		flex: 1;
		margin-bottom: 0;
	}

	.input-group {
		margin-bottom: 1.5rem;
	}

	.input-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.input-group input {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-radius: 4px;
		font-size: 1rem;
		box-sizing: border-box;
		transition: border-color 0.2s;
	}

	.input-group input:focus {
		outline: none;
		border-color: var(--color-theme-2);
	}

	.input-group input:disabled {
		background-color: #e0e0e0;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.input-group select {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-radius: 4px;
		font-size: 1rem;
		box-sizing: border-box;
		transition: border-color 0.2s;
		background-color: white;
	}

	.input-group select:focus {
		outline: none;
		border-color: var(--color-theme-2);
	}

	.input-group select:disabled {
		background-color: #e0e0e0;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.top-section.locked {
		opacity: 0.7;
	}

	.top-section-buttons {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
		margin-bottom: 0;
	}

	.enter-btn,
	.new-btn {
		flex: 1;
		padding: 0.75rem;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.enter-btn {
		background: #4caf50;
		color: white;
	}

	.enter-btn:hover:not(:disabled) {
		background: #45a049;
	}

	.enter-btn:disabled {
		background: #cccccc;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.new-btn {
		background: #2196f3;
		color: white;
	}

	.new-btn:hover {
		background: #0b7dda;
	}

	.form-divider {
		border: none;
		border-top: 2px solid rgba(0, 0, 0, 0.1);
		margin: 1.5rem 0;
	}

	.reset-btn {
		width: 100%;
		padding: 0.75rem;
		background: var(--color-theme-1);
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.reset-btn:hover:not(:disabled) {
		background: #cc2e00;
	}

	.reset-btn:disabled {
		background: #cccccc;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.button-row {
		display: flex;
		gap: 1rem;
	}

	.button-row .reset-btn {
		flex: 1;
	}

	.view-previous-link {
		flex: 1;
		padding: 0.75rem;
		background: var(--color-theme-2);
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 600;
		text-decoration: none;
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
		cursor: pointer;
	}

	.view-previous-link:hover:not(.disabled) {
		background: #1a5a8a;
	}

	.view-previous-link.disabled {
		background: #cccccc;
		cursor: not-allowed;
		opacity: 0.6;
		pointer-events: none;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.modal-content {
		position: relative;
		background: white;
		border-radius: 8px;
		padding: 2rem;
		max-width: 600px;
		width: 90%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	.modal-close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: transparent;
		border: none;
		font-size: 2rem;
		line-height: 1;
		cursor: pointer;
		color: var(--color-text);
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: background 0.2s;
	}

	.modal-close:hover {
		background: rgba(0, 0, 0, 0.1);
	}

	.load-results {
		background: transparent;
		padding: 0;
		margin: 0;
		box-shadow: none;
	}


	.load-results h2 {
		margin-top: 0;
		margin-bottom: 1.5rem;
		color: var(--color-theme-2);
		text-align: center;
	}

	.result-card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.result-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.5);
		border-radius: 4px;
	}

	.result-item .label {
		font-weight: 600;
		color: var(--color-text);
	}

	.result-item .value {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-theme-2);
	}

	@media (max-width: 640px) {
		.input-row {
			flex-direction: column;
		}

		.input-row .input-group {
			margin-bottom: 1.5rem;
		}
	}

	/* Chatbot Styles */
	.chatbot-container {
		position: fixed;
		bottom: 20px;
		right: 20px;
		z-index: 999;
	}

	.chatbot-toggle {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: var(--color-theme-2);
		color: white;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.chatbot-toggle:hover {
		transform: scale(1.1);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
	}

	.chatbot-window {
		width: 380px;
		height: 500px;
		background: white;
		border-radius: 12px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.chatbot-header {
		background: var(--color-theme-2);
		color: white;
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.chatbot-header h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.chatbot-close {
		background: transparent;
		border: none;
		color: white;
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: background 0.2s;
	}

	.chatbot-close:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.chatbot-messages {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: #f5f5f5;
	}

	.chatbot-message {
		display: flex;
		align-items: flex-start;
	}

	.chatbot-message.user-message {
		justify-content: flex-end;
	}

	.message-content {
		max-width: 75%;
		padding: 0.75rem 1rem;
		border-radius: 12px;
		background: white;
		color: var(--color-text);
		font-size: 0.9rem;
		line-height: 1.4;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	.chatbot-message.user-message .message-content {
		background: var(--color-theme-2);
		color: white;
	}

	.chatbot-input-container {
		display: flex;
		gap: 0.5rem;
		padding: 1rem;
		background: white;
		border-top: 1px solid #e0e0e0;
	}

	.chatbot-input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		font-size: 0.9rem;
		outline: none;
		transition: border-color 0.2s;
	}

	.chatbot-input:focus {
		border-color: var(--color-theme-2);
	}

	.chatbot-send {
		padding: 0.75rem 1.5rem;
		background: var(--color-theme-2);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.chatbot-send:hover {
		background: #1a5a8a;
	}

	@media (max-width: 640px) {
		.chatbot-window {
			width: calc(100vw - 40px);
			height: calc(100vh - 100px);
			max-height: 500px;
		}
	}

</style>


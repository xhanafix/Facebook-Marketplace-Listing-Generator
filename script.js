class MarketplaceListing {
    constructor() {
        this.apiKey = localStorage.getItem('openRouterApiKey') || '';
        this.theme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        this.bindElements();
        this.bindEvents();
        this.updateApiKeyInput();
        this.applyTheme();
    }

    bindElements() {
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.saveApiKeyBtn = document.getElementById('saveApiKey');
        this.listingForm = document.getElementById('listingForm');
        this.outputSection = document.getElementById('outputSection');
        this.themeToggle = document.getElementById('themeToggle');
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    bindEvents() {
        this.saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        this.listingForm.addEventListener('submit', (e) => this.handleSubmit(e));
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    updateApiKeyInput() {
        this.apiKeyInput.value = this.apiKey;
    }

    saveApiKey() {
        const newApiKey = this.apiKeyInput.value.trim();
        if (newApiKey) {
            localStorage.setItem('openRouterApiKey', newApiKey);
            this.apiKey = newApiKey;
            alert('API key saved successfully!');
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.theme);
        this.applyTheme();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        this.themeToggle.innerHTML = this.theme === 'light' ? 
            '<i class="fas fa-moon"></i>' : 
            '<i class="fas fa-sun"></i>';
    }

    showLoading() {
        this.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    async generateListings(formData) {
        this.showLoading();
        
        const prompt = this.createPrompt(formData);
        
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'FB Marketplace Listing Generator'
                },
                body: JSON.stringify({
                    model: 'google/learnlm-1.5-pro-experimental:free',
                    messages: [{
                        role: 'user',
                        content: prompt
                    }]
                })
            });

            const data = await response.json();
            this.hideLoading();
            return this.parseAIResponse(data.choices[0].message.content);
        } catch (error) {
            this.hideLoading();
            console.error('Error generating listings:', error);
            throw new Error('Failed to generate listings. Please check your API key and try again.');
        }
    }

    createPrompt(formData) {
        const languageInstructions = formData.language === 'malay' ? 
            `Please generate the listings in Bahasa Malaysia following Dewan Bahasa dan Pustaka guidelines:
            1. Use proper Bahasa Malaysia grammar and spelling
            2. Avoid informal language or slang
            3. Use standard terminology as approved by DBP
            4. Maintain professional tone and structure` :
            `Please generate the listings in English`;

        return `Generate 3 different Facebook Marketplace listings for the following product:
            Title: ${formData.title}
            Category: ${formData.category}
            Description: ${formData.description}
            Price: $${formData.price}
            Condition: ${formData.condition}

            ${languageInstructions}

            Please create listings that:
            1. Comply with Facebook Marketplace policies
            2. Are engaging and professional
            3. Include key details and specifications
            4. Use appropriate formatting and structure
            5. Are unique from each other
            6. Include relevant product tags/keywords
            7. Use persuasive copywriting techniques:
               - Create urgency
               - Highlight unique value propositions
               - Use social proof elements
               - Include clear call-to-action
            8. Format the output with clear sections:
               - Attention-grabbing headline
               - Key features (bullet points)
               - Detailed description
               - Product specifications
               - Product tags/keywords
               - Call to action

            Make each listing compelling and irresistible to potential buyers.`;
    }

    parseAIResponse(response) {
        // Split the response into individual listings
        const listings = response.split(/Listing \d:/).filter(Boolean);
        return listings.map(listing => {
            // Add some visual formatting to the listing text
            const formattedListing = listing.trim()
                .replace(/Features:/g, '\n📋 Features:')
                .replace(/Specifications:/g, '\n🔍 Specifications:')
                .replace(/Tags:/g, '\n🏷️ Tags:')
                .replace(/Price:/g, '\n💰 Price:')
                .replace(/Contact:/g, '\n📱 Contact:')
                .replace(/•/g, '◆')
                .replace(/\n-/g, '\n◆');
            return formattedListing;
        });
    }

    checkCompliance(listing, language) {
        const violations = [];
        
        // Add basic compliance checks
        if (listing.toLowerCase().includes('prohibited')) violations.push('Contains prohibited terms');
        if (listing.toLowerCase().includes('illegal')) violations.push('Contains illegal terms');
        if (listing.length > 5000) violations.push('Listing is too long');
        
        // Add Malay language specific checks
        if (language === 'malay') {
            const informalWords = ['la', 'lah', 'kot', 'jer', 'je'];
            informalWords.forEach(word => {
                if (listing.toLowerCase().includes(` ${word} `)) {
                    violations.push('Contains informal language');
                }
            });
        }
        
        return {
            passed: violations.length === 0,
            violations
        };
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = {
            title: document.getElementById('title').value,
            category: document.getElementById('category').value,
            description: document.getElementById('description').value,
            price: document.getElementById('price').value,
            condition: document.getElementById('condition').value,
            language: document.getElementById('outputLanguage').value
        };

        try {
            const listings = await this.generateListings(formData);
            this.displayListings(listings);
        } catch (error) {
            alert(error.message);
        }
    }

    displayListings(listings) {
        this.outputSection.innerHTML = '';
        const language = document.getElementById('outputLanguage').value;
        
        listings.forEach((listing, index) => {
            const compliance = this.checkCompliance(listing, language);
            
            const listingCard = document.createElement('div');
            listingCard.className = 'listing-card';
            
            const complianceText = language === 'malay' ? {
                pass: '✓ Penyenaraian mematuhi dasar Facebook Marketplace',
                fail: '⚠ Isu pematuhan ditemui: '
            } : {
                pass: '✓ Listing complies with Facebook Marketplace policies',
                fail: '⚠ Compliance issues found: '
            };

            const copyText = language === 'malay' ? 'Salin ke Papan Keratan' : 'Copy to Clipboard';
            const variationText = language === 'malay' ? 'Variasi Penyenaraian' : 'Listing Variation';
            
            listingCard.innerHTML = `
                <h3>${variationText} ${index + 1}</h3>
                <pre>${listing}</pre>
                <div class="button-group">
                    <button class="copy-btn" onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent)">
                        <i class="fas fa-copy"></i> ${copyText}
                    </button>
                </div>
                <div class="compliance-check ${compliance.passed ? 'pass' : 'fail'}">
                    ${compliance.passed ? 
                        complianceText.pass : 
                        complianceText.fail + compliance.violations.join(', ')}
                </div>
            `;
            
            setTimeout(() => {
                this.outputSection.appendChild(listingCard);
            }, index * 200);
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new MarketplaceListing();
}); 
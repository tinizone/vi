// Khởi tạo Web3 với RPC Polygon
let web3;
let userAccount;
const polygonRpcUrl = "https://polygon-rpc.com";

// Kiểm tra ví trên thiết bị di động và máy tính
if (typeof window.ethereum !== "undefined") {
    web3 = new Web3(window.ethereum);
} else if (typeof window.web3 !== "undefined") {
    web3 = new Web3(window.web3.currentProvider);
} else {
    web3 = new Web3(polygonRpcUrl);
    alert("Không phát hiện ví. Vui lòng truy cập từ trình duyệt của MetaMask!");
}

// ABI đầy đủ của ERC-20
const erc20ABI = [
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "success", "type": "bool"}],
        "type": "function"
    }
];

// Địa chỉ hợp đồng Proxy Advanced của 3 token trên Polygon
const tokens = {
    COT: {
        address: "0x0d4013b4e2e2f89171bbe956da995757fb5a6678",
        contract: null,
        symbol: "COT",
        logo: "https://raw.githubusercontent.com/tinizone/Logo/refs/heads/main/Cotien256.png"
    },
    PIX: {
        address: "0x1d7e521627cc4955ac8df6fe2fcb45891d0f30b7",
        contract: null,
        symbol: "PIX",
        logo: "https://raw.githubusercontent.com/tinizone/Logo/refs/heads/main/Pi256.png"
    },
    TIN: {
        address: "0xe7d8c8818106a565980315675d7adcb1d8ab1318",
        contract: null,
        symbol: "TIN",
        logo: "https://raw.githubusercontent.com/tinizone/Logo/refs/heads/main/Tin256.png"
    }
};

// Khởi tạo hợp đồng
function initializeContracts() {
    tokens.COT.contract = new web3.eth.Contract(erc20ABI, tokens.COT.address);
    tokens.PIX.contract = new web3.eth.Contract(erc20ABI, tokens.PIX.address);
    tokens.TIN.contract = new web3.eth.Contract(erc20ABI, tokens.TIN.address);
}

// Chuyển mạng sang Polygon nếu cần
async function switchToPolygon() {
    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x89" }]
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [{
                    chainId: "0x89",
                    chainName: "Polygon Mainnet",
                    rpcUrls: [polygonRpcUrl],
                    nativeCurrency: {
                        name: "MATIC",
                        symbol: "MATIC",
                        decimals: 18
                    },
                    blockExplorerUrls: ["https://polygonscan.com/"]
                }]
            });
        } else {
            throw switchError;
        }
    }
}

// Thêm token vào MetaMask
async function addTokenToMetaMask(token) {
    try {
        await window.ethereum.request({
            method: "wallet_watchAsset",
            params: {
                type: "ERC20",
                options: {
                    address: token.address,
                    symbol: token.symbol,
                    decimals: 18,
                    image: token.logo
                }
            }
        });
    } catch (error) {
        console.error(`Lỗi khi thêm ${token.symbol} vào MetaMask:`, error);
    }
}

// Kết nối ví MetaMask
async function connectWallet() {
    try {
        if (!window.ethereum && !window.web3) {
            alert("Không phát hiện ví. Vui lòng truy cập từ trình duyệt của MetaMask!");
            return;
        }

        await switchToPolygon();
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAccount = accounts[0];
        document.getElementById("wallet-address").innerText = `Địa chỉ ví: ${userAccount}`;

        initializeContracts();
        updateBalances(userAccount);

        // Thêm tất cả token vào MetaMask
        await addTokenToMetaMask(tokens.COT);
        await addTokenToMetaMask(tokens.PIX);
        await addTokenToMetaMask(tokens.TIN);

        // Lấy lịch sử giao dịch
        fetchTransactionHistory(userAccount);
    } catch (error) {
        console.error("Lỗi khi kết nối ví:", error);
        alert("Không thể kết nối ví. Vui lòng kiểm tra MetaMask và mạng Polygon.");
    }
}

// Cập nhật số dư token
async function updateBalances(account) {
    try {
        const cotBalance = await tokens.COT.contract.methods.balanceOf(account).call();
        document.getElementById("cot-balance").innerText = web3.utils.fromWei(cotBalance, "ether");

        const pixBalance = await tokens.PIX.contract.methods.balanceOf(account).call();
        document.getElementById("pix-balance").innerText = web3.utils.fromWei(pixBalance, "ether");

        const tinBalance = await tokens.TIN.contract.methods.balanceOf(account).call();
        document.getElementById("tin-balance").innerText = web3.utils.fromWei(tinBalance, "ether");
    } catch (error) {
        console.error("Lỗi khi lấy số dư:", error);
        alert("Không thể lấy số dư. Đảm bảo bạn đã kết nối đúng mạng Polygon.");
    }
}

// Gửi token
async function transferToken() {
    const tokenSymbol = document.getElementById("token-select").value;
    const recipient = document.getElementById("recipient-address").value;
    const amount = document.getElementById("amount").value;

    if (!web3.utils.isAddress(recipient)) {
        alert("Địa chỉ nhận không hợp lệ!");
        return;
    }

    if (!amount || isNaN(amount) || amount <= 0) {
        alert("Số lượng không hợp lệ!");
        return;
    }

    try {
        const token = tokens[tokenSymbol];
        const amountWei = web3.utils.toWei(amount, "ether");
        const result = await token.contract.methods.transfer(recipient, amountWei).send({ from: userAccount });
        alert(`Gửi ${amount} ${tokenSymbol} thành công! Tx Hash: ${result.transactionHash}`);
        updateBalances(userAccount);
        fetchTransactionHistory(userAccount);
    } catch (error) {
        console.error("Lỗi khi gửi token:", error);
        alert("Không thể gửi token. Vui lòng kiểm tra số dư và phí gas.");
    }
}

// Lấy lịch sử giao dịch từ Polygonscan API
async function fetchTransactionHistory(account) {
    const apiKey = "Your_Polygonscan_API_Key"; // Thay bằng API Key của bạn (đăng ký trên Polygonscan)
    const url = `https://api.polygonscan.com/api?module=account&action=tokentx&address=${account}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        const historyDiv = document.getElementById("transaction-history");
        historyDiv.innerHTML = "";

        if (data.status === "1" && data.result.length > 0) {
            const transactions = data.result.slice(0, 5); // Lấy 5 giao dịch gần nhất
            transactions.forEach(tx => {
                const tokenSymbol = tx.tokenSymbol;
                const amount = web3.utils.fromWei(tx.value, "ether");
                const direction = tx.from.toLowerCase() === account.toLowerCase() ? "Gửi" : "Nhận";
                const otherAddress = direction === "Gửi" ? tx.to : tx.from;
                const txLink = `https://polygonscan.com/tx/${tx.hash}`;
                const historyItem = `
                    <div class="history-item">
                        ${direction} ${amount} ${tokenSymbol} ${direction === "Gửi" ? "đến" : "từ"} ${otherAddress}<br>
                        <a href="${txLink}" target="_blank">Xem giao dịch</a>
                    </div>`;
                historyDiv.innerHTML += historyItem;
            });
        } else {
            historyDiv.innerHTML = "<p>Không có giao dịch nào.</p>";
        }
    } catch (error) {
        console.error("Lỗi khi lấy lịch sử giao dịch:", error);
        document.getElementById("transaction-history").innerHTML = "<p>Không thể tải lịch sử giao dịch.</p>";
    }

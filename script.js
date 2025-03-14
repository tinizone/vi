// Khởi tạo Web3 với RPC Polygon
let web3;
const polygonRpcUrl = "https://polygon-rpc.com";

// Kiểm tra nếu đang chạy trên thiết bị di động và có MetaMask
if (typeof window.ethereum !== "undefined") {
    web3 = new Web3(window.ethereum);
} else if (typeof window.web3 !== "undefined") {
    // Một số ví trên di động (như Trust Wallet) có thể sử dụng window.web3
    web3 = new Web3(window.web3.currentProvider);
} else {
    // Nếu không có ví, sử dụng RPC công khai (chỉ để đọc)
    web3 = new Web3(polygonRpcUrl);
    alert("Không phát hiện ví. Vui lòng truy cập từ trình duyệt của MetaMask hoặc cài đặt MetaMask!");
}

// ABI cơ bản của ERC-20
const erc20ABI = [
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    }
];

// Địa chỉ hợp đồng Proxy Advanced của 3 token trên Polygon
const tokens = {
    COT: {
        address: "0x0d4013b4e2e2f89171bbe956da995757fb5a6678",
        contract: null
    },
    PIX: {
        address: "0x1d7e521627cc4955ac8df6fe2fcb45891d0f30b7",
        contract: null
    },
    TIN: {
        address: "0xe7d8c8818106a565980315675d7adcb1d8ab1318",
        contract: null
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
            params: [{ chainId: "0x89" }] // Chain ID 137 (Polygon Mainnet) trong hex
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

// Kết nối ví MetaMask
async function connectWallet() {
    try {
        if (!window.ethereum && !window.web3) {
            alert("Không phát hiện ví. Vui lòng truy cập từ trình duyệt của MetaMask!");
            return;
        }

        // Chuyển sang mạng Polygon
        await switchToPolygon();

        // Yêu cầu kết nối tài khoản
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        const account = accounts[0];
        document.getElementById("wallet-address").innerText = `Địa chỉ ví: ${account}`;

        // Khởi tạo hợp đồng và cập nhật số dư
        initializeContracts();
        updateBalances(account);
    } catch (error) {
        console.error("Lỗi khi kết nối ví:", error);
        alert("Không thể kết nối ví. Vui lòng kiểm tra MetaMask và mạng Polygon.");
    }
}

// Cập nhật số dư token
async function updateBalances(account) {
    try {
        // Lấy số dư COT
        const cotBalance = await tokens.COT.contract.methods.balanceOf(account).call();
        document.getElementById("cot-balance").innerText = web3.utils.fromWei(cotBalance, "ether");

        // Lấy số dư PIX
        const pixBalance = await tokens.PIX.contract.methods.balanceOf(account).call();
        document.getElementById("pix-balance").innerText = web3.utils.fromWei(pixBalance, "ether");

        // Lấy số dư TIN
        const tinBalance = await tokens.TIN.contract.methods.balanceOf(account).call();
        document.getElementById("tin-balance").innerText = web3.utils.fromWei(tinBalance, "ether");
    } catch (error) {
        console.error("Lỗi khi lấy số dư:", error);
        alert("Không thể lấy số dư. Đảm bảo bạn đã kết nối đúng mạng Polygon.");
    }
}

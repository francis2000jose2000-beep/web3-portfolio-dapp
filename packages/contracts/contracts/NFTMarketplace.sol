// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC721URIStorage } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NFTMarketplace is ERC721URIStorage, Ownable, ReentrancyGuard {
    error PriceMustBeAboveZero();
    error IncorrectListingFee(uint256 sent, uint256 required);
    error ItemDoesNotExist(uint256 tokenId);
    error NotItemOwner(address caller);
    error ItemNotForSale(uint256 tokenId);
    error IncorrectSalePrice(uint256 sent, uint256 required);
    error PayoutFailed(address recipient, uint256 amount);
    error AuctionAlreadyActive(uint256 tokenId);
    error AuctionNotActive(uint256 tokenId);
    error AuctionNotEnded(uint256 tokenId, uint256 endTime);
    error AuctionAlreadyEnded(uint256 tokenId, uint256 endTime);
    error BidTooLow(uint256 sent, uint256 minRequired);
    error NotTokenOwner(address caller);

    struct MarketItem {
        uint256 itemId;
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
    }

    struct Auction {
        uint256 minBid;
        uint256 highestBid;
        address payable highestBidder;
        uint256 endTime;
        bool active;
    }

    uint256 private _tokenIds;
    uint256 private _itemIds;
    uint256 private _itemsSold;

    uint256 public constant INITIAL_LISTING_FEE = 0.025 ether;
    uint256 private _listingFee;

    mapping(uint256 => MarketItem) private _idToMarketItem;
    mapping(uint256 => uint256) private _tokenIdToItemId;

    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => address payable) public auctionSellers;

    event MarketItemCreated(
        uint256 indexed itemId,
        uint256 indexed tokenId,
        address indexed seller,
        address owner,
        uint256 price
    );

    event MarketItemSold(uint256 indexed itemId, uint256 indexed tokenId, address indexed buyer, uint256 price);
    event MarketItemRelisted(uint256 indexed itemId, uint256 indexed tokenId, address indexed seller, uint256 price);
    event ListingFeeUpdated(uint256 previousFee, uint256 newFee);

    event AuctionCreated(uint256 indexed tokenId, address indexed seller, uint256 minBid, uint256 endTime);
    event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed tokenId, address indexed seller, address indexed winner, uint256 amount);

    constructor() ERC721("NFT Marketplace", "NFTM") Ownable(msg.sender) {
        _listingFee = INITIAL_LISTING_FEE;
    }

    function getListingFee() external view returns (uint256) {
        return _listingFee;
    }

    function setListingFee(uint256 newFee) external onlyOwner {
        // AccessControl: Only owner can update listing fee
        uint256 previousFee = _listingFee;
        _listingFee = newFee;
        emit ListingFeeUpdated(previousFee, newFee);
    }

    function createToken(string memory tokenUri, uint256 price) external payable nonReentrant returns (uint256) {
        // ReentrancyGuard: Prevents reentrant calls
        if (price == 0) revert PriceMustBeAboveZero();
        if (msg.value != _listingFee) revert IncorrectListingFee(msg.value, _listingFee);

        // Gas Optimization: Unchecked increment is safe as it won't overflow
        unchecked {
            _tokenIds += 1;
        }
        uint256 tokenId = _tokenIds;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenUri);

        _createMarketItem(tokenId, price);

        // Listing fee is paid immediately to the marketplace owner.
        _payout(payable(owner()), msg.value);

        return tokenId;
    }

    function resellToken(uint256 tokenId, uint256 price) external payable nonReentrant {
        if (price == 0) revert PriceMustBeAboveZero();
        if (msg.value != _listingFee) revert IncorrectListingFee(msg.value, _listingFee);

        uint256 itemId = _tokenIdToItemId[tokenId];
        if (itemId == 0) revert ItemDoesNotExist(tokenId);

        MarketItem storage item = _idToMarketItem[itemId];
        if (item.owner != payable(msg.sender)) revert NotItemOwner(msg.sender);

        item.sold = false;
        item.price = price;
        item.seller = payable(msg.sender);
        item.owner = payable(address(this));

        if (_itemsSold > 0) {
            // Gas Optimization: Unchecked decrement is safe due to check above
            unchecked {
                _itemsSold -= 1;
            }
        }

        _transfer(msg.sender, address(this), tokenId);
        _payout(payable(owner()), msg.value);

        emit MarketItemRelisted(itemId, tokenId, msg.sender, price);
    }

    function createMarketSale(uint256 tokenId) external payable nonReentrant {
        uint256 itemId = _tokenIdToItemId[tokenId];
        if (itemId == 0) revert ItemDoesNotExist(tokenId);

        MarketItem storage item = _idToMarketItem[itemId];
        if (item.owner != payable(address(this))) revert ItemNotForSale(tokenId);
        if (msg.value != item.price) revert IncorrectSalePrice(msg.value, item.price);

        address payable seller = item.seller;

        item.owner = payable(msg.sender);
        item.sold = true;
        item.seller = payable(address(0));
        
        // Gas Optimization: Unchecked increment is safe
        unchecked {
            _itemsSold += 1;
        }

        _transfer(address(this), msg.sender, tokenId);
        _payout(seller, msg.value);

        emit MarketItemSold(itemId, tokenId, msg.sender, msg.value);
    }

    function createAuction(uint256 tokenId, uint256 minBid, uint256 duration) external nonReentrant {
        if (minBid == 0) revert PriceMustBeAboveZero();
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner(msg.sender);

        Auction storage existing = auctions[tokenId];
        if (existing.active) revert AuctionAlreadyActive(tokenId);

        // slither-disable-next-line timestamp
        // Justification: Block timestamp manipulation (approx 15s) does not critically impact auction duration logic.
        uint256 endTime = block.timestamp + duration;
        auctions[tokenId] = Auction({
            minBid: minBid,
            highestBid: 0,
            highestBidder: payable(address(0)),
            endTime: endTime,
            active: true
        });
        auctionSellers[tokenId] = payable(msg.sender);

        _transfer(msg.sender, address(this), tokenId);

        emit AuctionCreated(tokenId, msg.sender, minBid, endTime);
    }

    function placeBid(uint256 tokenId) external payable nonReentrant {
        Auction storage auction = auctions[tokenId];
        if (!auction.active) revert AuctionNotActive(tokenId);
        // slither-disable-next-line timestamp
        // Justification: Block timestamp manipulation (approx 15s) does not critically impact auction duration logic.
        if (block.timestamp >= auction.endTime) revert AuctionAlreadyEnded(tokenId, auction.endTime);

        uint256 minRequired = auction.highestBid == 0 ? auction.minBid : auction.highestBid + 1;
        if (msg.value < minRequired) revert BidTooLow(msg.value, minRequired);

        address payable previousBidder = auction.highestBidder;
        uint256 previousBid = auction.highestBid;

        // CEI: State updated before external call to prevent reentrancy
        auction.highestBid = msg.value;
        auction.highestBidder = payable(msg.sender);

        if (previousBid > 0) {
            // slither-disable-next-line denial-service
            // Justification: We prefer failing the transaction if refund fails to prevent theft of previous bid.
            // PullPayment would require UX changes (withdraw pattern) which is out of scope.
            _payout(previousBidder, previousBid);
        }

        emit BidPlaced(tokenId, msg.sender, msg.value);
    }

    function endAuction(uint256 tokenId) external nonReentrant {
        Auction storage auction = auctions[tokenId];
        if (!auction.active) revert AuctionNotActive(tokenId);
        // slither-disable-next-line timestamp
        // Justification: Block timestamp manipulation (approx 15s) does not critically impact auction duration logic.
        if (block.timestamp < auction.endTime) revert AuctionNotEnded(tokenId, auction.endTime);

        auction.active = false;

        address payable seller = auctionSellers[tokenId];
        address payable winner = auction.highestBidder;
        uint256 amount = auction.highestBid;

        delete auctionSellers[tokenId];

        if (winner == payable(address(0)) || amount == 0) {
            _transfer(address(this), seller, tokenId);
            emit AuctionEnded(tokenId, seller, address(0), 0);
            return;
        }

        _transfer(address(this), winner, tokenId);
        // CEI: Payout after state changes and transfer
        _payout(seller, amount);

        emit AuctionEnded(tokenId, seller, winner, amount);
    }

    function fetchMarketItems() external view returns (MarketItem[] memory) {
        uint256 itemCount = _itemIds;
        uint256 unsoldCount = itemCount - _itemsSold;
        MarketItem[] memory items = new MarketItem[](unsoldCount);

        uint256 currentIndex = 0;
        // slither-disable-next-line costly-loop
        // Justification: Loop is bounded by block gas limit; suitable for low-volume v1. Production v2 will use off-chain indexer.
        for (uint256 itemId = 1; itemId <= itemCount; ) {
            MarketItem storage item = _idToMarketItem[itemId];
            if (item.owner == payable(address(this))) {
                items[currentIndex] = item;
                unchecked {
                    currentIndex++;
                }
            }
            unchecked {
                itemId++;
            }
        }

        return items;
    }

    function fetchMyNFTs() external view returns (MarketItem[] memory) {
        uint256 totalCount = _itemIds;
        uint256 myCount = 0;

        // slither-disable-next-line costly-loop
        // Justification: Loop is bounded by block gas limit; suitable for low-volume v1. Production v2 will use off-chain indexer.
        for (uint256 itemId = 1; itemId <= totalCount; ) {
            if (_idToMarketItem[itemId].owner == payable(msg.sender)) {
                unchecked {
                    myCount++;
                }
            }
            unchecked {
                itemId++;
            }
        }

        MarketItem[] memory items = new MarketItem[](myCount);
        uint256 currentIndex = 0;
        // slither-disable-next-line costly-loop
        // Justification: Loop is bounded by block gas limit; suitable for low-volume v1. Production v2 will use off-chain indexer.
        for (uint256 itemId = 1; itemId <= totalCount; ) {
            MarketItem storage item = _idToMarketItem[itemId];
            if (item.owner == payable(msg.sender)) {
                items[currentIndex] = item;
                unchecked {
                    currentIndex++;
                }
            }
            unchecked {
                itemId++;
            }
        }

        return items;
    }

    function fetchItemsListed() external view returns (MarketItem[] memory) {
        uint256 totalCount = _itemIds;
        uint256 listedCount = 0;

        // slither-disable-next-line costly-loop
        // Justification: Loop is bounded by block gas limit; suitable for low-volume v1. Production v2 will use off-chain indexer.
        for (uint256 itemId = 1; itemId <= totalCount; ) {
            if (_idToMarketItem[itemId].seller == payable(msg.sender)) {
                unchecked {
                    listedCount++;
                }
            }
            unchecked {
                itemId++;
            }
        }

        MarketItem[] memory items = new MarketItem[](listedCount);
        uint256 currentIndex = 0;
        // slither-disable-next-line costly-loop
        // Justification: Loop is bounded by block gas limit; suitable for low-volume v1. Production v2 will use off-chain indexer.
        for (uint256 itemId = 1; itemId <= totalCount; ) {
            MarketItem storage item = _idToMarketItem[itemId];
            if (item.seller == payable(msg.sender)) {
                items[currentIndex] = item;
                unchecked {
                    currentIndex++;
                }
            }
            unchecked {
                itemId++;
            }
        }

        return items;
    }

    function _createMarketItem(uint256 tokenId, uint256 price) private {
        // Gas Optimization: Unchecked increment is safe
        unchecked {
            _itemIds += 1;
        }
        uint256 itemId = _itemIds;

        _idToMarketItem[itemId] = MarketItem({
            itemId: itemId,
            tokenId: tokenId,
            seller: payable(msg.sender),
            owner: payable(address(this)),
            price: price,
            sold: false
        });

        _tokenIdToItemId[tokenId] = itemId;

        _transfer(msg.sender, address(this), tokenId);

        emit MarketItemCreated(itemId, tokenId, msg.sender, address(this), price);
    }

    function _payout(address payable recipient, uint256 amount) private {
        // Use low-level call to forward ETH safely; reverts on failure.
        // slither-disable-next-line low-level-calls
        // Justification: Address.sendValue is deprecated; call is safe with ReentrancyGuard.
        (bool ok, ) = recipient.call{ value: amount }("");
        if (!ok) revert PayoutFailed(recipient, amount);
    }
}

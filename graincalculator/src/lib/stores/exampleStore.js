// @ts-nocheck
import { writable } from 'svelte/store';
import { db } from '$lib/firebase/firebase.client';
import {
    addDoc,
    updateDoc,
    getDoc,
    getDocs,
    collection,
    doc,
    query,
    where,
    writeBatch,
    Timestamp
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { offerHandlers } from './offerStore';



const listingCollection = collection(db, 'listings');
// Listing store state
export const listingStore = writable({
    isLoading: true,
    listings: [],
    myItemsListed: [],
    companyListings: [],
    currentListing: null,
    myCartListings: [],
    paginationState: { lastDocs: [], totalPages: 0 }
});

export const listingHandlers = {
    syncListings: async () => {
        try {
            const res = await fetch('/api/sync-listings');
            if (!res.ok) {
                console.error('Sync failed with status:', res.status);
            } else {
                console.log('Listings synced successfully');
            }
        } catch (error) {
            console.error('Error syncing listings:', error);
        }
    },

    // TODO: double check this to see if we want to keep it or run it only once after the creation of the listing is done.
    getListings: async () => {
        try {
            const listingsQuery = query(listingCollection);
            const snapshot = await getDocs(listingsQuery);
            const listings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            listingStore.set({ isLoading: false, listings });
        } catch (error) {
            console.error('Error fetching listings:', error);
        }
    },

    getListingPriceById: async (listingId) => {
        try {
            const listingRef = doc(db, 'listings', listingId);
            const listingDoc = await getDoc(listingRef);
            if (listingDoc.exists()) {
                const listingData = listingDoc.data();
                return listingData.price;
            } else {
                console.warn(`Listing with ID ${listingId} does not exist.`);
                return null;
            }
        } catch (error) {
            console.error('Error fetching listing price:', error);
            throw error;
        }
    },

    getItemIdsFromListings: async (listingIds) => {
        if (!listingIds || listingIds.length === 0) {
            return [];
        } else {
            try {

                const itemIds = [];

                for (const listingId of listingIds) {
                    const listingRef = doc(db, 'listings', listingId);
                    const listingDoc = await getDoc(listingRef);

                    if (listingDoc.exists()) {
                        const listingData = listingDoc.data();

                        const handlingUnits = listingData.handlingUnits || [];

                        handlingUnits.forEach((unit) => {
                            const items = unit.items || [];
                            items.forEach((item) => {

                                itemIds.push(item);

                            });
                        });
                    } else {
                        console.warn(`Listing with ID ${listingId} does not exist.`);
                    }
                }

                listingStore.update(state => ({
                    ...state,
                    isLoading: false,
                    myItemsListed: itemIds
                }));

                return itemIds;
            } catch (error) {
                console.error('Error fetching item IDs from listings:', error);
                throw error;
            }
        }
    },

    getAvailableItemIdsFromArchivedListings: async (listingIds) => {
        /**
         * This function takes in a list of listings that only my company owns
         * and returns a deduplicated list of item IDs that are currently listed
         */
        if (!listingIds || listingIds.length === 0) {
            listingStore.update(state => ({
                ...state,
                isLoading: false,
                myItemsListed: []
            }));
            return [];
        }

        try {
            let itemIds = []; // Use a Set to automatically deduplicate

            for (const listingId of listingIds) {
                const listingRef = doc(db, 'listings', listingId);
                const listingDoc = await getDoc(listingRef);

                if (listingDoc.exists()) {
                    const listingData = listingDoc.data();
                    const handlingUnits = listingData.handlingUnits || [];
                    handlingUnits.forEach((unit) => {
                        let items = unit.items || [];
                        items.forEach((item) => {
                            itemIds.push(item); // Add to Set to automatically deduplicate
                        });
                    });
                } else {
                    console.warn(`Listing with ID ${listingId} does not exist.`);
                }
            }

            const uniqueItemIds = Array.from(itemIds); // Convert Set back to array

            listingStore.update(state => ({
                ...state,
                isLoading: false,
                myItemsListed: uniqueItemIds
            }));

            return uniqueItemIds;
        } catch (error) {
            console.error('Error fetching item IDs from listings:', error);
            listingStore.update(state => ({
                ...state,
                isLoading: false,
                myItemsListed: []
            }));
            throw error;
        }
    },

    getCompanyListings: async (listingIds) => {
        if (!listingIds || listingIds.length === 0) {
            listingStore.update((state) => ({
                ...state,
                companyListings: [],
                isLoading: false
            }));
            return;
        }
        try {
            const fetchedListings = [];
            for (const listingId of listingIds) {
                const listingRef = doc(db, 'listings', listingId);
                const listingDoc = await getDoc(listingRef);
                if (listingDoc.exists()) {
                    fetchedListings.push({ id: listingDoc.id, ...listingDoc.data() });
                } else {
                    console.warn(`Listing with ID ${listingId} does not exist.`);
                }
            }


            listingStore.update((state) => ({
                ...state,
                companyListings: fetchedListings,
                isLoading: false
            }));


            return fetchedListings;
        } catch (error) {
            console.error('Error fetching company listings:', error);
            throw error;
        }
    },

    fetchMyCartListings: async (cartItems) => {
        if (!Array.isArray(cartItems) || cartItems.length === 0) {
            console.warn('No cart items provided.');
            listingStore.update(state => ({ ...state, myCartListings: [] }));
            return;
        }

        const listingIds = cartItems.map(item => item.productId);

        try {
            const res = await fetch('/api/cartListings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listingIds })
            });
            if (!res.ok) throw new Error(`API error ${res.status}`);
            const { listings } = await res.json();
            const fetchedListings = listings.map(listing => {
                const cartItem = cartItems.find(i => i.productId === listing.id);
                return {
                    ...listing,
                    quantity: cartItem?.quantity || 1
                };
            });

            // Update the store with the fetched products
            listingStore.update(state => ({
                ...state,
                myCartListings: fetchedListings,
                isLoading: false,
            }));
        } catch (error) {
            console.error('Error fetching cart products:', error);
            listingStore.update(state => ({ ...state, myCartListings: [], isLoading: false }));
        }
    },



    getListing: async (listingId) => {
        try {
            const listingRef = doc(db, 'listings', listingId);
            const listingDoc = await getDoc(listingRef);
            if (listingDoc.exists()) {
                listingStore.update(state => ({
                    ...state,
                    isLoading: false,
                    currentListing: { id: listingDoc.id, ...listingDoc.data() }
                }));
                return listingDoc.data();
            } else {
                console.warn(`Listing with ID ${listingId} does not exist.`);
                listingStore.update(state => ({
                    ...state,
                    isLoading: false,
                    currentListing: null
                }));
            }
        } catch (error) {
            console.error('Error fetching listing:', error);
        }
    },

    handleGetListingForEditing: async (currentListingId, listingIds) => {
        listingStore.update(state => ({
            ...state,
            isLoading: true,
        }));

        try {
            const listingRef = doc(db, 'listings', currentListingId);
            const listingSnap = await getDoc(listingRef);

            let currentListing = null;
            if (listingSnap.exists()) {
                currentListing = { id: listingSnap.id, ...listingSnap.data() };
            } else {
                console.warn(`Listing with ID ${currentListingId} does not exist.`);
            }

            const itemIds = [];
            if (Array.isArray(listingIds) && listingIds.length) {
                for (const id of listingIds) {
                    const ref = doc(db, 'listings', id);
                    const snap = await getDoc(ref);
                    if (snap.exists()) {
                        const data = snap.data();
                        if (data.listingDesignation !== 'listed') {
                            continue;
                        }
                        (data.handlingUnits).forEach(unit => {
                            (unit.items).forEach(itemId => {
                                itemIds.push(itemId);
                            });
                        });
                    } else {
                        console.warn(`Listing with ID ${id} does not exist.`);
                    }
                }
            }

            // Update store once with all fetched data
            listingStore.update(state => ({
                ...state,
                isLoading: false,
                currentListing,
                myItemsListed: itemIds,
            }));

            return { currentListing, itemIds };
        } catch (error) {
            console.error('Error in handleGetListingForEditing:', error);
            listingStore.update(state => ({
                ...state,
                isLoading: false,
            }));
            throw error;
        }
    },

    getListingById: async (listingId) => {
        try {
            const listingRef = doc(db, 'listings', listingId);
            const listingDoc = await getDoc(listingRef);
            if (listingDoc.exists()) {
                let listingData = listingDoc.data();
                listingData.id = listingDoc.id;
                return listingData
            } else {
                console.warn(`Listing with ID ${listingId} does not exist.`);

            }
        } catch (error) {
            console.error('Error fetching listing:', error);
        }
    },

    // Keep this because it'll update it in the marketplace
    updateListingsDesignation: async (listings, newDesignation) => {
        try {
            for (const listing of listings) {
                const listingRef = doc(db, 'listings', listing.id);
                await updateDoc(listingRef, { listingDesignation: newDesignation });
            }
            // Fire-and-forget: don't await the sync
            listingHandlers.syncListings().catch(error => {
                console.error('Background sync failed:', error);
            });
        } catch (error) {
            console.error('Error updating listing designations:', error);
            throw error;
        }
    },

    createListing: async (listingData) => {
        try {
            const listingsRef = collection(db, 'listings');
            const newListingRef = await addDoc(listingsRef, {
                ...listingData,
                imageUrls: []
            });
            await updateDoc(newListingRef, { id: newListingRef.id });
            return newListingRef.id;
        } catch (error) {
            console.error('Error creating listing:', error);
            throw error;
        }
    },

    uploadImages: async (listingId, imageFiles) => {
        async function compressImage(file) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const url = URL.createObjectURL(file);
                img.onload = () => {
                    const { width, height } = img;
                    if (width <= 1080 && height <= 1080) {
                        URL.revokeObjectURL(url);
                        resolve(file);
                        return;
                    }
                    let newWidth, newHeight;
                    if (width > height) {
                        newWidth = 1080;
                        newHeight = Math.round((height * 1080) / width);
                    } else {
                        newHeight = 1080;
                        newWidth = Math.round((width * 1080) / height);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, newWidth, newHeight);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], file.name, { type: file.type });
                            resolve(compressedFile);
                        } else {
                            reject(new Error('Canvas is empty'));
                        }
                        URL.revokeObjectURL(url);
                    }, file.type, 0.92);
                };
                img.onerror = (error) => {
                    URL.revokeObjectURL(url);
                    reject(error);
                };
                img.src = url;
            });
        }

        try {
            const storage = getStorage();
            const imageUrls = await Promise.all(
                imageFiles.map(async (file) => {
                    const fileToUpload = await compressImage(file);
                    const metadata = {
                        contentType: fileToUpload.type || 'image/jpeg',
                    };
                    const storageRef = ref(storage, `listing_images/${listingId}/${fileToUpload.name}`);
                    await uploadBytes(storageRef, fileToUpload, metadata);
                    return getDownloadURL(storageRef);
                })
            );

            return imageUrls;
        } catch (error) {
            console.error('Error uploading images:', error);
            throw error;
        }
    },

    updateListing: async (listingId, listingData) => {
        try {
            const listingRef = doc(db, 'listings', listingId);
            await updateDoc(listingRef, listingData);

            const offersRef = collection(db, 'offers');
            const offersQuery = query(offersRef, where('listingId', '==', listingId));
            const offersSnapshot = await getDocs(offersQuery);

            // add in an email notification here to the buyer
            if (!offersSnapshot.empty) {
                const batch = writeBatch(db);

                const newHistoryEntry = {
                    createdAt: Timestamp.now(),
                    eventType: 'listingUpdated',
                    message: "The listing was updated, please check its details before continuing."
                };

                offersSnapshot.forEach((offerDoc) => {
                    const offerData = offerDoc.data();
                    const currentHistory = offerData.offerHistory ? [...offerData.offerHistory] : [];
                    currentHistory.push(newHistoryEntry);

                    batch.update(offerDoc.ref, {
                        offerHistory: currentHistory,
                        buyerHasRead: false,
                        sellerHasRead: false,
                        updatedAt: Timestamp.now()
                    });
                });

                await batch.commit();

                // ─── SEND EMAIL TO EACH BUYER ──────────────────────────────
                for (const offerDoc of offersSnapshot.docs) {
                    const offer = offerDoc.data();
                    if (offer.buyerId) {
                        try {
                            await offerHandlers.sendOfferUpdateEmail(offer, offer.buyerId);
                        } catch (emailErr) {
                            console.error('Error sending listing‐update email to buyer:', emailErr);
                        }
                    }
                }
            }

            // Fire-and-forget: don't await the sync
            listingHandlers.syncListings().catch(error => {
                console.error('Background sync failed:', error);
            });
            return listingId;
        } catch (error) {
            console.error('Error updating listing:', error);
            throw error;
        }
    },


    deleteListing: async (listingId) => {
        try {
            const listingRef = doc(db, 'listings', listingId);
            await updateDoc(listingRef, { listingDesignation: 'archived' });

            listingStore.update((state) => {
                const patch = (arr) =>
                    Array.isArray(arr)
                        ? arr.map((l) =>
                            l.id === listingId ? { ...l, listingDesignation: 'archived' } : l
                        )
                        : arr;

                const updatedState = {
                    ...state,
                    listings: patch(state.listings),
                    companyListings: patch(state.companyListings),
                    myCartListings: patch(state.myCartListings),
                    currentListing:
                        state.currentListing?.id === listingId
                            ? { ...state.currentListing, listingDesignation: 'archived' }
                            : state.currentListing,
                };

                return updatedState;
            });

            // Fire-and-forget: don't await the sync
            listingHandlers.syncListings().catch(error => {
                console.error('Background sync failed:', error);
            });
            return listingId;
        } catch (error) {
            console.error('Error deleting listing:', error);
            throw error;
        }
    },

    getListingLocationByListingId: async (listingId) => {
        try {
            const listingRef = doc(db, 'listings', listingId);
            const listingDoc = await getDoc(listingRef);
            if (listingDoc.exists()) {
                const listingData = listingDoc.data();
                return listingData.location;
            } else {
                console.warn(`Listing with ID ${listingId} does not exist.`);
                return null;
            }
        } catch (error) {
            console.error('Error fetching listing location:', error);
            throw error;
        }
    }

};
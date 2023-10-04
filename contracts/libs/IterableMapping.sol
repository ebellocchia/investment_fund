// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @author Emanuele Bellocchia (ebellocchia@gmail.com)
 * @title  Library implementing a mapping that can be iterated
 * @notice This is achieved by using a helper array to keep track of keys
 */
library IterableMapping {
    //=============================================================//
    //                         STRUCTURES                          //
    //=============================================================//

    /// Single map entry
    struct MapEntry {
        uint256 value;
        uint256 index;
        bool added;
    }

    /// Map that keeps track of entries and keys
    struct Map {
        address[] keys;
        mapping(address => MapEntry) entries;
    }

    //=============================================================//
    //                          FUNCTIONS                          //
    //=============================================================//

    /**
     * Get all map keys
     * @param map_ Map
     * @return keys Array of map keys
     */
    function allKeys(
        Map storage map_
    ) internal view returns (address[] memory) {
        return map_.keys;
    }

    /**
     * Get if map is empty
     * @param map_ Map
     * @return is_empty True if empty, false otherwise
     */
    function isEmpty(
        Map storage map_
    ) internal view returns (bool) {
        return _is_empty(map_);
    }

    /**
     * Get map length
     * @param map_ Map
     * @return Map length
     */
    function length(
        Map storage map_
    ) internal view returns (uint256) {
        return _length(map_);
    }

    /**
     * Get if the map value with the specified key exists.
     * @param map_ Map
     * @param key_ Key
     * @return True if exists, false otherwise
     */
    function existsByKey(
        Map storage map_,
        address key_
    ) internal view returns (bool) {
        return _entryByKey(map_, key_).added;
    }

    /**
     * Get if the map value at the specified index exists.
     * @param map_   Map
     * @param index_ Index
     * @return True if exists, false otherwise
     */
    function existsByIndex(
        Map storage map_,
        uint256 index_
    ) internal view returns (bool) {
        // It's sufficient that the index is valid for the entry to exist
        return _isValidIndex(map_, index_);
    }

    /**
     * Get the map value with the specified key.
     * @param map_ Map
     * @param key_ Key
     * @return Entry value
     */
    function getByKey(
        Map storage map_,
        address key_
    ) internal view returns (uint256) {
        return _entryByKey(map_, key_).value;
    }

    /**
     * Get the map value at the specified index.
     * @param map_   Map
     * @param index_ Index
     * @return Entry value
     */
    function getByIndex(
        Map storage map_,
        uint256 index_
    ) internal view returns (uint256) {
        return _entryByIndex(map_, index_).value;
    }

    /**
     * Get the map key at the specified index.
     * @param map_   Map
     * @param index_ Index
     * @return Key
     */
    function keyAtIndex(
        Map storage map_,
        uint256 index_
    ) internal view returns (address) {
        return _keyAtIndex(map_, index_);
    }

    /**
     * Set the map entry with the specified key and value (if not existent, it'll be created)
     * @param map_   Map
     * @param key_   Key
     * @param value_ Value
     */
    function set(
        Map storage map_,
        address key_,
        uint256 value_
    ) internal {
        MapEntry storage entry = _entryByKey(map_, key_);
        if (entry.added) {
            entry.value = value_;
        }
        else {
            _createEntry(map_, key_, value_);
        }
    }

    /**
     * Add the specified value to the map entry with the specified key (if not existent, it'll be created)
     * @param map_   Map
     * @param key_   Key
     * @param value_ Value
     */
    function add(
        Map storage map_,
        address key_,
        uint256 value_
    ) internal {
        MapEntry storage entry = _entryByKey(map_, key_);
        if (entry.added) {
            entry.value += value_;
        }
        else {
            _createEntry(map_, key_, value_);
        }
    }

    /**
     * Remove the map entry with the specified key.
     * @param map_ Map
     * @param key_ Key
     */
    function removeByKey(
        Map storage map_,
        address key_
    ) internal {
        MapEntry storage entry_to_be_removed = _entryByKey(map_, key_);
        if (!entry_to_be_removed.added) {
            return;
        }

        // Move the last element to the removed one
        address last_key = map_.keys[_length(map_) - 1];
        map_.keys[entry_to_be_removed.index] = last_key;
        map_.entries[last_key].index = entry_to_be_removed.index;

        // Remove
        delete map_.entries[key_];
        map_.keys.pop();
    }

    /**
     * Remove the map entry at the specified index.
     * @param map_   Map
     * @param index_ Index
     */
    function removeByIndex(
        Map storage map_,
        uint256 index_
    ) internal {
        if (!_isValidIndex(map_, index_)) {
            return;
        }

        // Move the last element to the removed one
        address key_to_be_removed = map_.keys[index_];
        address last_key = map_.keys[_length(map_) - 1];
        map_.keys[index_] = last_key;
        map_.entries[last_key].index = index_;

        // Remove
        delete map_.entries[key_to_be_removed];
        map_.keys.pop();
    }

    /**
     * Remove all map entries.
     * @param map_ Map
     */
    function removeAll(
        Map storage map_
    ) internal {
        if (_is_empty(map_)) {
            return;
        }

        uint256 len = _length(map_);
        for (uint256 i = 0; i < len; i++) {
            delete map_.entries[map_.keys[i]];
        }
        delete map_.keys;
    }

    /**
     * Get the map length.
     * @param map_ Map
     * @return Map length
     */
    function _length(
        Map storage map_
    ) internal view returns (uint256) {
        return map_.keys.length;
    }

    /**
     * Get if map is empty.
     * @param map_ Map
     * @return True if empty, false otherwise
     */
    function _is_empty(
        Map storage map_
    ) internal view returns (bool) {
        return _length(map_) == 0;
    }

    /**
     * Get if the specified index is valid.
     * @param map_   Map
     * @param index_ Index
     * @return True if valid, false otherwise
     */
    function _isValidIndex(
        Map storage map_,
        uint256 index_
    ) internal view returns (bool) {
        return index_ < _length(map_);
    }

    /**
     * Get the map key at the specified index.
     * @param map_   Map
     * @param index_ Index
     * @return Key
     */
    function _keyAtIndex(
        Map storage map_,
        uint256 index_
    ) internal view returns (address) {
        return map_.keys[index_];
    }

    /**
     * Get the map entry with the specified key.
     * @param map_ Map
     * @param key_ Key
     * @return Entry
     */
    function _entryByKey(
        Map storage map_,
        address key_
    ) internal view returns (MapEntry storage) {
        return map_.entries[key_];
    }

    /**
     * Get the map entry at the specified index.
     * @param map_   Map
     * @param index_ Index
     * @return Entry
     */
    function _entryByIndex(
        Map storage map_,
        uint256 index_
    ) internal view returns (MapEntry storage) {
        return map_.entries[_keyAtIndex(map_, index_)];
    }

    /**
     * Create a map entry with the specified key and value
     * @param map_   Map
     * @param key_   Key
     * @param value_ Value
     */
    function _createEntry(
        Map storage map_,
        address key_,
        uint256 value_
    ) internal {
        MapEntry storage entry = _entryByKey(map_, key_);
        entry.added = true;
        entry.value = value_;
        entry.index = _length(map_);
        map_.keys.push(key_);
    }
}

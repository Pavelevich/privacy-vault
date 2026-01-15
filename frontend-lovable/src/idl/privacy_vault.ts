export type PrivacyVault = {
  "version": "0.1.0",
  "name": "privacy_vault",
  "instructions": [
    {
      "name": "initializeVault",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": "ValidityProof"
          }
        },
        {
          "name": "addressTreeInfo",
          "type": {
            "defined": "PackedAddressTreeInfo"
          }
        },
        {
          "name": "outputStateTreeIndex",
          "type": "u8"
        },
        {
          "name": "systemAccountsOffset",
          "type": "u8"
        }
      ]
    },
    {
      "name": "deposit",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": "ValidityProof"
          }
        },
        {
          "name": "addressTreeInfo",
          "type": {
            "defined": "PackedAddressTreeInfo"
          }
        },
        {
          "name": "outputStateTreeIndex",
          "type": "u8"
        },
        {
          "name": "systemAccountsOffset",
          "type": "u8"
        },
        {
          "name": "commitment",
          "type": {
            "array": ["u8", 32]
          }
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdraw",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "inputMerkleTree",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": "ValidityProof"
          }
        },
        {
          "name": "addressTreeInfo",
          "type": {
            "defined": "PackedAddressTreeInfo"
          }
        },
        {
          "name": "outputStateTreeIndex",
          "type": "u8"
        },
        {
          "name": "systemAccountsOffset",
          "type": "u8"
        },
        {
          "name": "inputRootIndex",
          "type": "u16"
        },
        {
          "name": "nullifierHash",
          "type": {
            "array": ["u8", 32]
          }
        },
        {
          "name": "recipient",
          "type": "publicKey"
        },
        {
          "name": "zkProof",
          "type": {
            "defined": "CompressedProof"
          }
        }
      ]
    },
    {
      "name": "proveInnocence",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "depositMerkleTree",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": "ValidityProof"
          }
        },
        {
          "name": "addressTreeInfo",
          "type": {
            "defined": "PackedAddressTreeInfo"
          }
        },
        {
          "name": "outputStateTreeIndex",
          "type": "u8"
        },
        {
          "name": "systemAccountsOffset",
          "type": "u8"
        },
        {
          "name": "inputRootIndex",
          "type": "u16"
        },
        {
          "name": "associationSetRoot",
          "type": {
            "array": ["u8", 32]
          }
        },
        {
          "name": "nullifierHash",
          "type": {
            "array": ["u8", 32]
          }
        },
        {
          "name": "associationSetId",
          "type": "u8"
        },
        {
          "name": "zkProof",
          "type": {
            "defined": "CompressedProof"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "VaultAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "totalDeposits",
            "type": "u64"
          },
          {
            "name": "totalWithdrawals",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "DepositAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commitment",
            "type": {
              "array": ["u8", 32]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "NullifierAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nullifierHash",
            "type": {
              "array": ["u8", 32]
            }
          },
          {
            "name": "usedAt",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "InnocenceProofAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nullifierHash",
            "type": {
              "array": ["u8", 32]
            }
          },
          {
            "name": "associationSetId",
            "type": "u8"
          },
          {
            "name": "provenAt",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "ValidityProof",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "compressedProof",
            "type": {
              "defined": "CompressedProof"
            }
          }
        ]
      }
    },
    {
      "name": "CompressedProof",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "a",
            "type": {
              "array": ["u8", 32]
            }
          },
          {
            "name": "b",
            "type": {
              "array": ["u8", 64]
            }
          },
          {
            "name": "c",
            "type": {
              "array": ["u8", 32]
            }
          }
        ]
      }
    },
    {
      "name": "PackedAddressTreeInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "addressTreeAccountIndex",
            "type": "u8"
          },
          {
            "name": "addressQueueAccountIndex",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "AccountNotEnoughKeys",
      "msg": "Not enough keys in remaining accounts"
    },
    {
      "code": 6001,
      "name": "NullifierAlreadyUsed",
      "msg": "Nullifier already used - double spend attempt"
    },
    {
      "code": 6002,
      "name": "InvalidProof",
      "msg": "Invalid ZK proof"
    },
    {
      "code": 6003,
      "name": "InvalidMerkleRoot",
      "msg": "Invalid Merkle root"
    }
  ]
};

export const IDL: PrivacyVault = {
  "version": "0.1.0",
  "name": "privacy_vault",
  "instructions": [
    {
      "name": "initializeVault",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": "ValidityProof"
          }
        },
        {
          "name": "addressTreeInfo",
          "type": {
            "defined": "PackedAddressTreeInfo"
          }
        },
        {
          "name": "outputStateTreeIndex",
          "type": "u8"
        },
        {
          "name": "systemAccountsOffset",
          "type": "u8"
        }
      ]
    },
    {
      "name": "deposit",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": "ValidityProof"
          }
        },
        {
          "name": "addressTreeInfo",
          "type": {
            "defined": "PackedAddressTreeInfo"
          }
        },
        {
          "name": "outputStateTreeIndex",
          "type": "u8"
        },
        {
          "name": "systemAccountsOffset",
          "type": "u8"
        },
        {
          "name": "commitment",
          "type": {
            "array": ["u8", 32]
          }
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdraw",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "inputMerkleTree",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": "ValidityProof"
          }
        },
        {
          "name": "addressTreeInfo",
          "type": {
            "defined": "PackedAddressTreeInfo"
          }
        },
        {
          "name": "outputStateTreeIndex",
          "type": "u8"
        },
        {
          "name": "systemAccountsOffset",
          "type": "u8"
        },
        {
          "name": "inputRootIndex",
          "type": "u16"
        },
        {
          "name": "nullifierHash",
          "type": {
            "array": ["u8", 32]
          }
        },
        {
          "name": "recipient",
          "type": "publicKey"
        },
        {
          "name": "zkProof",
          "type": {
            "defined": "CompressedProof"
          }
        }
      ]
    },
    {
      "name": "proveInnocence",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "depositMerkleTree",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": "ValidityProof"
          }
        },
        {
          "name": "addressTreeInfo",
          "type": {
            "defined": "PackedAddressTreeInfo"
          }
        },
        {
          "name": "outputStateTreeIndex",
          "type": "u8"
        },
        {
          "name": "systemAccountsOffset",
          "type": "u8"
        },
        {
          "name": "inputRootIndex",
          "type": "u16"
        },
        {
          "name": "associationSetRoot",
          "type": {
            "array": ["u8", 32]
          }
        },
        {
          "name": "nullifierHash",
          "type": {
            "array": ["u8", 32]
          }
        },
        {
          "name": "associationSetId",
          "type": "u8"
        },
        {
          "name": "zkProof",
          "type": {
            "defined": "CompressedProof"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "VaultAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "totalDeposits",
            "type": "u64"
          },
          {
            "name": "totalWithdrawals",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "DepositAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commitment",
            "type": {
              "array": ["u8", 32]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "NullifierAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nullifierHash",
            "type": {
              "array": ["u8", 32]
            }
          },
          {
            "name": "usedAt",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "InnocenceProofAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nullifierHash",
            "type": {
              "array": ["u8", 32]
            }
          },
          {
            "name": "associationSetId",
            "type": "u8"
          },
          {
            "name": "provenAt",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "ValidityProof",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "compressedProof",
            "type": {
              "defined": "CompressedProof"
            }
          }
        ]
      }
    },
    {
      "name": "CompressedProof",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "a",
            "type": {
              "array": ["u8", 32]
            }
          },
          {
            "name": "b",
            "type": {
              "array": ["u8", 64]
            }
          },
          {
            "name": "c",
            "type": {
              "array": ["u8", 32]
            }
          }
        ]
      }
    },
    {
      "name": "PackedAddressTreeInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "addressTreeAccountIndex",
            "type": "u8"
          },
          {
            "name": "addressQueueAccountIndex",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "AccountNotEnoughKeys",
      "msg": "Not enough keys in remaining accounts"
    },
    {
      "code": 6001,
      "name": "NullifierAlreadyUsed",
      "msg": "Nullifier already used - double spend attempt"
    },
    {
      "code": 6002,
      "name": "InvalidProof",
      "msg": "Invalid ZK proof"
    },
    {
      "code": 6003,
      "name": "InvalidMerkleRoot",
      "msg": "Invalid Merkle root"
    }
  ]
};

// Program ID
export const PROGRAM_ID = "9zvpj82hnzpjFhYGVL6tT3Bh3GBAoaJnVxe8ZsDqMwnu";

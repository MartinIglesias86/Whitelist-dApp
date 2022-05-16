import Head from "next/head";
import styles from "../styles/Home.module.css";
import Web3Modal from "web3modal";
import { providers, Contract } from "ethers";
import { useEffect, useRef, useState } from "react";
import { WHITELIST_CONTRACT_ADDRESS, abi } from "../constants";
import Image from 'next/image';

export default function Home() {
  //keeping track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);
  //keeping track of whether the current metamask address has joined the Whitelist or not
  const [joinedWhitelist, setJoinedWhitelist] = useState(false);
  //loading is set to true when we are waiting for a transaction to get mined
  const [loading, setLoading] = useState(false);
  //numberOfWhitelisted tracks the number of addresses's whitelisted
  const [numberOfWhitelisted, setNumberOfWhitelisted] = useState(0);
  //create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
  const web3ModalRef = useRef();

  /**
   * returns a Provider or Signer object representing the Ethereum RPC with or without the
   * signing capabilities of metamask attached
   *
   * a `Provider` is needed to interact with the blockchain - reading transactions, reading balances, reading state, etc.
   *
   * a `Signer` is a special type of Provider used in case a `write` transaction needs to be made to the blockchain, which involves the connected account
   * needing to make a digital signature to authorize the transaction being sent. Metamask exposes a Signer API to allow your website to
   * request signatures from the user using Signer functions.
   *
   * @param {*} needSigner - True if you need the signer, default false otherwise
   */
  const getProviderOrSigner = async (needSigner=false) => {
    //connect to Metamask
    //since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);
    //if user is not connected to the Rinkeby network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Change the network to Rinkeby please");
      throw new Error("Change the network to Rinkeby please");
    }

    if(needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };
  //addAddressToWhitelist: Adds the current connected address to the whitelist
  const addAddressToWhitelist = async () => {
    try {
      //we need a signer here since this is a write tx
      const signer = await getProviderOrSigner(true);
      //create a new instance of the Contract with a Signer, which allows update methods
      const whitelistContract = new Contract(
        WHITELIST_CONTRACT_ADDRESS,
        abi,
        signer
      );
      //call the addAddressToWhitelist from the contract
      const tx = await whitelistContract.addAddressToWhitelist();
      setLoading(true);
      //wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      //get updated number of addresses in the whitelist
      await getNumberOfWhitelisted();
      setJoinedWhitelist(true);
    }catch (err) {
      console.error(err);
    }
  };
  //getNumberOfWhitelisted gets the number of whitelisted addresses
  const getNumberOfWhitelisted = async () => {
    try {
      //get the provider from web3Modal
      const provider = await getProviderOrSigner();
      //we connect to the Contract using a Provider, so we will only have read-only access to the Contract
      const whitelistContract = new Contract(
        WHITELIST_CONTRACT_ADDRESS,
        abi,
        provider
      );
      //call the numAddressesWhitelisted from the contract
      const _numberOfWhitelisted = await whitelistContract.numAddressesWhitelisted();
      setNumberOfWhitelisted(_numberOfWhitelisted);
    }catch (err) {
      console.error(err);
    }
  };
  //checkIfAddressInWhitelist checks if the address is in whitelist
  const checkIfAddressInWhitelist = async () => {
    try {
      //we will need the signer later to get the user's address
      const signer = await getProviderOrSigner(true);
      const whitelistContract = new Contract(
        WHITELIST_CONTRACT_ADDRESS,
        abi,
        signer
      );
      //get the address associated to the signer which is connected to the wallet
      const address = await signer.getAddress();
      //call the whitelisted address from the contract
      const _joinedWhitelist = await whitelistContract.whitelistedAddresses(
        address
      );
      setJoinedWhitelist(_joinedWhitelist);
    }catch (err) {
      console.error(err);
    }
  };
  //connectWallet connects the MetaMask wallet
  const connectWallet = async () => {
    try {
      //get the provider from web3Modal, which in our case is MetaMask, when used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
      checkIfAddressInWhitelist();
      getNumberOfWhitelisted();
    }catch (err) {
      console.error(err);
    }
  };
  //renderButton returns a button based on the state of the dApp
  const renderButton = () => {
    if (walletConnected) {
      if (joinedWhitelist) {
        return (
          <div className={styles.description}>
            Gracias por unirte a la Whitelist!
          </div>
        );
      }else if (loading) {
        return (
          <button className={styles.button}>Cargando...</button>
        );
      }else {
        return (
          <button onClick={addAddressToWhitelist} className={styles.button}>
          Sumate a nuestra Whitelist!
        </button>
        );
      }
    }else {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Conecta tu billetera
        </button>
      );
    }
  };
  /*
  useEffects are used to react to changes in state of website.
  The array at the end of the function call represents what state changes will trigger this effect.
  In this case, whenever the value of "walletConnected" changes, this effect will be called
  */
useEffect(() => {
  //if the wallet is not connected, create a new instance of Web3Modal and connect to the wallet
  if (!walletConnected) {
    //assign the Web3Modal class to the reference object by setting it's "current" value
    //the "current" calue is persisted throughout as long as this page is open
    web3ModalRef.current = new Web3Modal({
      network: "rinkeby",
      providerOptions: {},
      disableInjectedProvider: false,
    });
    connectWallet();
  }
}, [walletConnected]);

return (
  <div>
    <Head>
      <title>Whitelist dApp</title>
      <meta name="description" content="Whitelist-dApp" />
      <link rel="icon" href="/favicon.ico" />
    </Head>
    <div className={styles.main}>
      <div>
        <h1 className={styles.title}>Bienvenido a Crypto Devs!</h1>
        <div className={styles.description}>
          Es una colección NFT para desarrolladores en Cripto.
        </div>
        <div className={styles.description}>
          {numberOfWhitelisted} devs ya se unieron a nuestra Whitelist!
        </div>
        {renderButton()}
      </div>
      <div>
        <img className={styles.image} src="./crypto-devs.svg" />
      </div>
    </div>
    <footer className={styles.footer}>
      Made with &#10084; by Martin Iglesias
    </footer>
  </div>
);
}
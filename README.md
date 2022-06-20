<h1> Smart-Raffle </h1>

<h2> A decentralised lottery prevents any middlemen intervention who can manipulate the results. Also the winners are paid instantly so there is no chance of fraud. Trust issues are minimised since now we just have to beleive in a piece of code whic will work as it is instructed to. </h2>

<h2> TechStack Involved : </h2>
<ul>
  <li> Solidity </li>
  <li> Hardhat </li>
  <li> Used ChainLink VRF and ChainLink Keepers </li>
  <li> ethers </li>
  
</ul>

<h2> Learnings : </h2>
<ul>
  <li> This smart contract was a bit challenging since now I had to generate a winner which was completely random. Initially I thought it would be very easy since All the programming languages I have worked with in past have a function named rand that generates random numbers for us. </li>
  <li> But such a randomisation was not a possible. Since Blockchains are by design deterministic. All the nodes involved in the network have to arrive at same result then only by consensus a piece of information would be approved and added to block. </li>
  <li> But just imagine all nodes using a rand function and each running independently. In this case there is a high possibility that all nodes generate different outputs and hence no consensus and thus this code won't be approved. </li>
  <li> This way I learnt that fine randomisation within the blokchain is not possible but what if I use external services that could be decentralised plus gurantee returning a completely random number to my nodes. </li>
  <li> This is when I got to know about ChainLink VRF(Verifiable Random Function). It was easy to integrate these services within my code but just had to buy some Link Tokens so as to pay the firm for all the external computation it does for me. </li>
  <li> I also wanted to call the lottery if time interval between past block mined and new block mined exceeded 30 sec. So this meant I have to call my declare randomWinner function again and again. </li>
  <li> But for this I have to write an external script that could continuosly check for conditions and execute the contract if the conditions are met. <li>
  <li> But to prevent this headache of writing an script I used ChainLink Keepers service which automatically checks for the condtions and if they are met execute the contract without me to worry about. <li>
 
 </ul>
 
 <h2> Difficulties : </h2>
 <ul>
  <li> Understanding about Randomisation in a blockchain was a bit challenging and still I am not 100% confident of the concept. There are some stories involved like the SmartLotteryHack which I have not completely understood from tech point of view. </li>
  <li> Debugging took a lot of time. For some miner errors that were contiously poping when I was writing down the tests for contract. Had to deal with them but it took quite a long time. </li>
</ul>  

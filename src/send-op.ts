import axios from "axios";
import { ethers } from "ethers";

type OpData = {
  account: string;
  target: string;
  args: any[];
  functionName: string;
  abi: any;
}

export const sendOp = async (requests: OpData[]) => {
  const ops = requests.map((request) => {
    const iface = new ethers.Interface(request.abi);
    const data = iface.encodeFunctionData(request.functionName, request.args);
    return {
      account: request.account,
      target: request.target,
      calldata: data,
    }
  })

  try {
    const response = await axios.post('/account-abstraction/operations', {
      ops,
    });
    return response.data;
  } catch (error) {
    console.error('Error sending operation:', error);
    return null;
  }
}

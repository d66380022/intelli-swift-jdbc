package com.fr.bi;
import com.fr.bi.common.factory.IFactoryService;
import com.fr.bi.common.factory.BIMateFactory;
import com.finebi.cube.common.log.BILoggerFactory;
/**
* This code is generated by tool,Please don't edit it unless you sure 
* what you are doing very much.
**/
public class FbiFactory{
public static void registerBeans(){
	try{
		IFactoryService xmlFactory =((IFactoryService) BIMateFactory.getInstance().getObject( IFactoryService.CONF_XML , new Object[]{}));}
		catch(Exception ignoreE){
		 BILoggerFactory.getLogger().error(ignoreE.getMessage(),ignoreE);
		}}
}